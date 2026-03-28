import * as crypto from "node:crypto";
import {
  createAuditEntryIdValue,

  createRequestIdValue,
  createSecretIdValue,
  createVersionIdValue,
} from "../internal/id-factory.js";
import { verifySignature } from "../protocol/crypto.js";
import type {
  AgentSecretGrant,
  SecretDestinationGrant,
  AgentIdentityRecord,
  AuditEntry,
  AuditQuery,

  DispatchInstruction,
  DispatchRequest,
  DispatchResult,
  RequestRecord,
  SecretAlias,
  SecretId,
  SecretRecord,
  VaultId,
  VaultPrincipal,
  StoredSessionToken,
} from "./contracts.js";
import { VaultCoreError } from "./errors.js";
import { DispatchStatus } from "./contracts.js";
import type {
  AuditLog,

  PolicyEngine,
  TrustedExecutor,
  VaultCoreDependencies,
} from "./ports.js";
import {
  AgentIdentityRegistry,
  AgentProofVerifier,
  AgentSecretGrantRegistry,
  SecretDestinationGrantRegistry,
  Clock,
  IdGenerator,
  ISessionTokenRegistry,
  RequestRecordRegistry,
  ReplayGuard,
  SecretCustody,
  SecretRepository,
} from "./ports.js";

export interface DefaultPolicyEngineOptions {
  now?: () => Date;
  trusted_issuer_ids?: readonly string[];
  trustedIssuerIdResolver?: (issuer_id: string) => Promise<boolean> | boolean;
}

export interface SignatureAgentProofVerifierOptions {
  maxSkewMs?: number;
  now?: () => Date;
}

function createDispatchBinding(request: DispatchRequest): string {
  return JSON.stringify({
    request_id: request.request_id,
    requested_at: request.requested_at,
    root_agent_id: request.agent.id,
    secret_alias: request.secret_alias ?? null,
    target_url: request.target_url,
    method: request.method,
    body: request.body ?? null,
  });
}


/**
 * @internal
 */
export class SystemClock implements Clock {
  nowIso(): string {
    return new Date().toISOString();
  }
}

/**
 * @internal
 */
export class RandomIdGenerator implements IdGenerator {
  newSecretId(): SecretId {
    return { value: createSecretIdValue() };
  }

  newVersion(): { value: string } {
    return { value: createVersionIdValue() };
  }

  newAuditEntryId(): string {
    return createAuditEntryIdValue();
  }




  newRequestId(action?: string): string {
    return createRequestIdValue(action);
  }
}

/**
 * @internal
 */
export class InMemorySecretRepository implements SecretRepository {
  private readonly _byAlias = new Map<string, SecretRecord>();
  private readonly _byId = new Map<string, SecretRecord>();

  private isActive(record: SecretRecord): boolean {
    return record.lifecycle_status ? record.lifecycle_status === "ACTIVE" : !record.retiredAt;
  }

  async save(record: SecretRecord): Promise<void> {
    this._byAlias.set(record.alias.value, record);
    this._byId.set(record.secret_id.value, record);
  }

  async delete(secret_id: SecretId): Promise<void> {
    const existing = this._byId.get(secret_id.value);
    if (!existing) {
      return;
    }
    this._byId.delete(secret_id.value);
    this._byAlias.delete(existing.alias.value);
  }

  async getByAlias(alias: SecretAlias): Promise<SecretRecord | null> {
    const record = this._byAlias.get(alias.value) ?? null;
    return record && this.isActive(record) ? record : null;
  }

  async getById(secret_id: SecretId): Promise<SecretRecord | null> {
    const record = this._byId.get(secret_id.value) ?? null;
    return record && this.isActive(record) ? record : null;
  }

  async list(vault_id: VaultId): Promise<readonly SecretRecord[]> {
    return Array.from(this._byId.values()).filter((record) => record.vault_id.value === vault_id.value && this.isActive(record));
  }
}

/**
 * @internal
 */
export class InMemoryAuditLog implements AuditLog {
  private readonly _entries: AuditEntry[] = [];

  async append(entry: AuditEntry): Promise<void> {
    this._entries.push(entry);
  }

  async query(query: AuditQuery): Promise<readonly AuditEntry[]> {
    return this._entries.filter((entry) => {
      if (query.actor_id && entry.actor.id !== query.actor_id) return false;
      if (query.secret_alias && entry.secret_alias !== query.secret_alias) return false;
      if (query.request_id && entry.request_id !== query.request_id) return false;
      if (query.since && entry.ts < query.since) return false;
      return true;
    });
  }
}

/**
 * @internal
 */
export class InMemorySecretCustody implements SecretCustody {
  private readonly _plaintextById = new Map<string, string>();

  async store(secret_id: SecretId, plaintext: string): Promise<void> {
    this._plaintextById.set(secret_id.value, plaintext);
  }

  async load(secret_id: SecretId): Promise<string | null> {
    return this._plaintextById.get(secret_id.value) ?? null;
  }

  async delete(secret_id: SecretId): Promise<void> {
    this._plaintextById.delete(secret_id.value);
  }
}

/**
 * @internal
 */
export class InMemoryAgentIdentityRegistry implements AgentIdentityRegistry {
  private readonly _identities = new Map<string, AgentIdentityRecord>();

  async register(identity: AgentIdentityRecord): Promise<void> {
    this._identities.set(`${identity.vault_id.value}:${identity.root_agent_id}`, identity);
  }

  async get(vault_id: VaultId, root_agent_id: string): Promise<AgentIdentityRecord | null> {
    return this._identities.get(`${vault_id.value}:${root_agent_id}`) ?? null;
  }

  async list(vault_id: VaultId): Promise<readonly AgentIdentityRecord[]> {
    const prefix = `${vault_id.value}:`;
    return Array.from(this._identities.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([, identity]) => identity);
  }
}

/**
 * @internal
 */
export class InMemoryAgentSecretGrantRegistry implements AgentSecretGrantRegistry {
  private readonly _grants = new Map<string, AgentSecretGrant>();

  private _key(vault_id: VaultId, root_agent_id: string, secret_alias: string): string {
    return `${vault_id.value}:${root_agent_id}:${secret_alias}`;
  }

  async upsert(grant: AgentSecretGrant): Promise<void> {
    this._grants.set(this._key(grant.vault_id, grant.root_agent_id, grant.secret_alias), grant);
  }

  async get(vault_id: VaultId, root_agent_id: string, secret_alias: string): Promise<AgentSecretGrant | null> {
    return this._grants.get(this._key(vault_id, root_agent_id, secret_alias)) ?? null;
  }

  async list(vault_id: VaultId, root_agent_id?: string): Promise<readonly AgentSecretGrant[]> {
    return Array.from(this._grants.values()).filter((grant) => {
      if (grant.vault_id.value !== vault_id.value) return false;
      if (root_agent_id && grant.root_agent_id !== root_agent_id) return false;
      return true;
    });
  }

  async delete(vault_id: VaultId, root_agent_id: string, secret_alias: string): Promise<void> {
    this._grants.delete(this._key(vault_id, root_agent_id, secret_alias));
  }
}

/**
 * @internal
 */
export class InMemorySecretDestinationGrantRegistry implements SecretDestinationGrantRegistry {
  private readonly _grants = new Map<string, SecretDestinationGrant>();

  private _key(vault_id: VaultId, secret_alias: string, site_id: string): string {
    return `${vault_id.value}:${secret_alias}:${site_id}`;
  }

  async upsert(grant: SecretDestinationGrant): Promise<void> {
    this._grants.set(this._key(grant.vault_id, grant.secret_alias, grant.site_id), grant);
  }

  async get(vault_id: VaultId, secret_alias: string, site_id: string): Promise<SecretDestinationGrant | null> {
    return this._grants.get(this._key(vault_id, secret_alias, site_id)) ?? null;
  }

  async list(vault_id: VaultId, secret_alias?: string): Promise<readonly SecretDestinationGrant[]> {
    return Array.from(this._grants.values()).filter((grant) => {
      if (grant.vault_id.value !== vault_id.value) return false;
      if (secret_alias && grant.secret_alias !== secret_alias) return false;
      return true;
    });
  }

  async delete(vault_id: VaultId, secret_alias: string, site_id: string): Promise<void> {
    this._grants.delete(this._key(vault_id, secret_alias, site_id));
  }
}

/**
 * @internal
 */


export class InMemoryRequestRecordRegistry implements RequestRecordRegistry {
  private readonly _records = new Map<string, RequestRecord>();

  async save(record: RequestRecord): Promise<void> {
    this._records.set(`${record.vault_id.value}:${record.request_id}`, record);
  }

  async get(vault_id: VaultId, request_id: string): Promise<RequestRecord | null> {
    return this._records.get(`${vault_id.value}:${request_id}`) ?? null;
  }

  async list(vault_id: VaultId, root_agent_id?: string): Promise<readonly RequestRecord[]> {
    return Array.from(this._records.values()).filter((record) => {
      if (record.vault_id.value !== vault_id.value) return false;
      if (root_agent_id && record.root_agent_id !== root_agent_id) return false;
      return true;
    });
  }
}

/**
 * @internal
 */
export class DefaultPolicyEngine implements PolicyEngine {
  constructor(private readonly _options: DefaultPolicyEngineOptions = {}) {}

  private validateRequestedAt(requested_at: string, fieldName: string): void {
    const parsed = Date.parse(requested_at);
    if (Number.isNaN(parsed)) {
      throw new VaultCoreError(`${fieldName} invalid`, "VAULT_WRITE_DENIED");
    }
  }

  private async isTrustedIssuer(issuer_id: string): Promise<boolean> {
    if (this._options.trustedIssuerIdResolver) {
      return await this._options.trustedIssuerIdResolver(issuer_id);
    }
    if (this._options.trusted_issuer_ids) {
      return this._options.trusted_issuer_ids.includes(issuer_id);
    }
    return false;
  }

  async authorizeWrite(command: import("./contracts.js").VaultWriteSecretCommand): Promise<void> {
    if (!command.alias.trim()) {
      throw new VaultCoreError("secret alias required", "VAULT_WRITE_DENIED");
    }
    if (!command.plaintext) {
      throw new VaultCoreError("secret plaintext required", "VAULT_WRITE_DENIED");
    }
    this.validateRequestedAt(command.requested_at, "requested_at");
    if (command.kind === "owner.create_secret" || command.kind === "owner.update_secret") return;
    if (command.issuer.id !== command.issuerSiteId) {
      throw new VaultCoreError("issuer identity mismatch", "VAULT_WRITE_DENIED");
    }
    if (!await this.isTrustedIssuer(command.issuer.id)) {
      throw new VaultCoreError("trusted issuer required", "VAULT_WRITE_DENIED");
    }
  }
}

export class InMemorySessionTokenRegistry implements ISessionTokenRegistry {
  private readonly _tokens = new Map<string, StoredSessionToken>();

  async issue(root_agent_id: string): Promise<string> {
    const token = `sat_${crypto.randomBytes(16).toString("hex")}`;
    this._tokens.set(token, {
      token,
      root_agent_id,
      issued_at: new Date().toISOString(),
    });
    return token;
  }

  async verify(token: string, root_agent_id: string): Promise<boolean> {
    const stored = this._tokens.get(token);
    if (!stored) return false;
    return stored.root_agent_id === root_agent_id;
  }

  async revoke(token: string): Promise<void> {
    this._tokens.delete(token);
  }

  async list(root_agent_id?: string): Promise<readonly StoredSessionToken[]> {
    const tokens = [...this._tokens.values()];
    return root_agent_id ? tokens.filter((token) => token.root_agent_id === root_agent_id) : tokens;
  }
}

/**
 * @internal
 */
export class SignatureAgentProofVerifier implements AgentProofVerifier {
  private readonly _maxSkewMs: number;
  private readonly _now: () => Date;

  constructor(
    private _identities: AgentIdentityRegistry,
    private _session_tokens: ISessionTokenRegistry,
    options: SignatureAgentProofVerifierOptions = {},
  ) {
    this._maxSkewMs = options.maxSkewMs ?? (5 * 60 * 1000);
    this._now = options.now ?? (() => new Date());
  }

  async verify(request: DispatchRequest): Promise<void> {
    const { vault_id, agent, proof, request_id, requested_at } = request;
    if (proof.root_agent_id !== agent.id) {
      throw new VaultCoreError("agent.identity mismatch", "VAULT_DISPATCH_DENIED");
    }

    // Try token authentication first
    if (proof.token) {
      const valid = await this._session_tokens.verify(proof.token, proof.root_agent_id);
      if (valid) {
        return; // Token is valid, skip signature check
      }
      throw new VaultCoreError("invalid or expired session token", "VAULT_DISPATCH_DENIED");
    }

    // Fallback to signature authentication
    if (!proof.signature) {
      throw new VaultCoreError("missing agent proof (signature or token required)", "VAULT_DISPATCH_DENIED");
    }

    if (proof.request_id !== request_id || proof.requested_at !== requested_at) {
      throw new VaultCoreError("proof binding mismatch", "VAULT_DISPATCH_DENIED");
    }

    const parsedRequestedAt = Date.parse(requested_at);
    const now = this._now().getTime();
    const maxSkewMs = this._maxSkewMs;

    if (Number.isNaN(parsedRequestedAt) || Math.abs(now - parsedRequestedAt) > maxSkewMs) {
      throw new VaultCoreError("proof timestamp out of range", "VAULT_DISPATCH_DENIED");
    }

    const identity = await this._identities.get(vault_id, proof.root_agent_id);
    if (!identity) {
      throw new VaultCoreError("agent.identity not registered", "VAULT_DISPATCH_DENIED");
    }

    const binding = createDispatchBinding(request);
    if (!verifySignature(identity.public_key, proof.signature, binding)) {
      throw new VaultCoreError("invalid proof signature", "VAULT_DISPATCH_DENIED");
    }
  }
}

export class InMemoryReplayGuard implements ReplayGuard {
  private readonly _seen = new Map<string, number>();
  private readonly _ttlMs: number;
  private readonly _now: () => Date;

  constructor(options: SignatureAgentProofVerifierOptions = {}) {
    this._ttlMs = options.maxSkewMs ?? (5 * 60 * 1000);
    this._now = options.now ?? (() => new Date());
  }

  async assertNotReplayed(request: DispatchRequest): Promise<void> {
    const now = this._now().getTime();
    for (const [key, seenAt] of this._seen.entries()) {
      if (now - seenAt > this._ttlMs) {
        this._seen.delete(key);
      }
    }
    const replayKey = `${request.agent.id}:${request.request_id}`;
    if (this._seen.has(replayKey)) {
      throw new VaultCoreError("request replay detected", "VAULT_DISPATCH_DENIED");
    }
    this._seen.set(replayKey, now);
  }
}

/**
 * @internal
 */
export class HttpDispatchExecutor implements TrustedExecutor {
  constructor(
    private readonly _fetchImpl: typeof fetch = fetch,
    private readonly _authHeaderName = "Authorization",
    private readonly _authPrefix = "Bearer ",
  ) {}

  async dispatch(
    instruction: DispatchInstruction,
    secret: { record: SecretRecord; plaintext: string },
  ): Promise<DispatchResult> {
    try {
      const response = await this._fetchImpl(instruction.target_url, {
        method: instruction.method,
        headers: {
          ...(instruction.headers ?? {}),
          [this._authHeaderName]: `${this._authPrefix}${secret.plaintext}`,
        },
        body: instruction.body,
      });
      return {
        vault_id: instruction.vault_id,
        request_id: instruction.request_id,
        status: response.ok ? DispatchStatus.SUCCEEDED : DispatchStatus.FAILED,
        target_url: instruction.target_url,
        method: instruction.method,
        response_status: response.status,
        response_body: await response.text(),
        error: response.ok ? undefined : `HTTP_${response.status}`,
      };
    } catch (error) {
      return {
        vault_id: instruction.vault_id,
        request_id: instruction.request_id,
        status: DispatchStatus.FAILED,
        target_url: instruction.target_url,
        method: instruction.method,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export interface VaultCoreDependenciesOptions {
  vault_id?: string;
  fetchImpl?: typeof fetch;
  authHeaderName?: string;
  authPrefix?: string;
  policy?: DefaultPolicyEngineOptions;
  proofVerifier?: SignatureAgentProofVerifierOptions;
  replayGuard?: ReplayGuard;
  session_tokens?: ISessionTokenRegistry;
  clock?: Clock;
}

export function createVaultCoreDependencies(
  options: VaultCoreDependenciesOptions = {},
): VaultCoreDependencies {
  const agentRecords = new InMemoryAgentIdentityRegistry();
  const session_tokens = options.session_tokens ?? new InMemorySessionTokenRegistry();
  return {
    vault_id: { value: options.vault_id ?? `vault_${crypto.randomUUID()}` },
    secrets: new InMemorySecretRepository(),
    custody: new InMemorySecretCustody(),
    policy: new DefaultPolicyEngine(options.policy),
    audit: new InMemoryAuditLog(),
    executor: new HttpDispatchExecutor(
      options.fetchImpl,
      options.authHeaderName,
      options.authPrefix,
    ),
    agentRecords,
    agentProofVerifier: new SignatureAgentProofVerifier(agentRecords, session_tokens, options.proofVerifier),
    agent_secretGrants: new InMemoryAgentSecretGrantRegistry(),
    secret_destinationGrants: new InMemorySecretDestinationGrantRegistry(),
    requests: new InMemoryRequestRecordRegistry(),
    replayGuard: options.replayGuard ?? new InMemoryReplayGuard(),
    session_tokens,
    clock: options.clock ?? new SystemClock(),
    ids: new RandomIdGenerator(),
  };
}
