import * as crypto from "node:crypto";
import {
  createAgentIdValue,
  createAuditEntryIdValue,
  createFlowIdValue,
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
  CustomHttpFlowDefinition,
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
  CustomHttpFlowRegistry,
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
  trustedIssuerIds?: readonly string[];
  trustedIssuerIdResolver?: (issuerId: string) => Promise<boolean> | boolean;
}

export interface SignatureAgentProofVerifierOptions {
  maxSkewMs?: number;
  now?: () => Date;
}

function createDispatchBinding(request: DispatchRequest): string {
  return JSON.stringify({
    requestId: request.requestId,
    requestedAt: request.requestedAt,
    agentId: request.agent.id,
    secretAlias: request.secretAlias ?? null,
    targetUrl: request.targetUrl,
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

  newAgentId(): string {
    return createAgentIdValue();
  }

  newFlowId(): string {
    return createFlowIdValue();
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
    return record.lifecycleStatus ? record.lifecycleStatus === "ACTIVE" : !record.retiredAt;
  }

  async save(record: SecretRecord): Promise<void> {
    this._byAlias.set(record.alias.value, record);
    this._byId.set(record.secretId.value, record);
  }

  async delete(secretId: SecretId): Promise<void> {
    const existing = this._byId.get(secretId.value);
    if (!existing) {
      return;
    }
    this._byId.delete(secretId.value);
    this._byAlias.delete(existing.alias.value);
  }

  async getByAlias(alias: SecretAlias): Promise<SecretRecord | null> {
    const record = this._byAlias.get(alias.value) ?? null;
    return record && this.isActive(record) ? record : null;
  }

  async getById(secretId: SecretId): Promise<SecretRecord | null> {
    const record = this._byId.get(secretId.value) ?? null;
    return record && this.isActive(record) ? record : null;
  }

  async list(vaultId: VaultId): Promise<readonly SecretRecord[]> {
    return Array.from(this._byId.values()).filter((record) => record.vaultId.value === vaultId.value && this.isActive(record));
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
      if (query.actorId && entry.actor.id !== query.actorId) return false;
      if (query.secretAlias && entry.secretAlias !== query.secretAlias) return false;
      if (query.requestId && entry.requestId !== query.requestId) return false;
      if (query.since && entry.occurredAt < query.since) return false;
      return true;
    });
  }
}

/**
 * @internal
 */
export class InMemorySecretCustody implements SecretCustody {
  private readonly _plaintextById = new Map<string, string>();

  async store(secretId: SecretId, plaintext: string): Promise<void> {
    this._plaintextById.set(secretId.value, plaintext);
  }

  async load(secretId: SecretId): Promise<string | null> {
    return this._plaintextById.get(secretId.value) ?? null;
  }

  async delete(secretId: SecretId): Promise<void> {
    this._plaintextById.delete(secretId.value);
  }
}

/**
 * @internal
 */
export class InMemoryAgentIdentityRegistry implements AgentIdentityRegistry {
  private readonly _identities = new Map<string, AgentIdentityRecord>();

  async register(identity: AgentIdentityRecord): Promise<void> {
    this._identities.set(`${identity.vaultId.value}:${identity.agentId}`, identity);
  }

  async get(vaultId: VaultId, agentId: string): Promise<AgentIdentityRecord | null> {
    return this._identities.get(`${vaultId.value}:${agentId}`) ?? null;
  }

  async list(vaultId: VaultId): Promise<readonly AgentIdentityRecord[]> {
    const prefix = `${vaultId.value}:`;
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

  private _key(vaultId: VaultId, agentId: string, secretAlias: string): string {
    return `${vaultId.value}:${agentId}:${secretAlias}`;
  }

  async upsert(grant: AgentSecretGrant): Promise<void> {
    this._grants.set(this._key(grant.vaultId, grant.agentId, grant.secretAlias), grant);
  }

  async get(vaultId: VaultId, agentId: string, secretAlias: string): Promise<AgentSecretGrant | null> {
    return this._grants.get(this._key(vaultId, agentId, secretAlias)) ?? null;
  }

  async list(vaultId: VaultId, agentId?: string): Promise<readonly AgentSecretGrant[]> {
    return Array.from(this._grants.values()).filter((grant) => {
      if (grant.vaultId.value !== vaultId.value) return false;
      if (agentId && grant.agentId !== agentId) return false;
      return true;
    });
  }

  async delete(vaultId: VaultId, agentId: string, secretAlias: string): Promise<void> {
    this._grants.delete(this._key(vaultId, agentId, secretAlias));
  }
}

/**
 * @internal
 */
export class InMemorySecretDestinationGrantRegistry implements SecretDestinationGrantRegistry {
  private readonly _grants = new Map<string, SecretDestinationGrant>();

  private _key(vaultId: VaultId, secretAlias: string, domain: string): string {
    return `${vaultId.value}:${secretAlias}:${domain}`;
  }

  async upsert(grant: SecretDestinationGrant): Promise<void> {
    this._grants.set(this._key(grant.vaultId, grant.secretAlias, grant.domain), grant);
  }

  async get(vaultId: VaultId, secretAlias: string, domain: string): Promise<SecretDestinationGrant | null> {
    return this._grants.get(this._key(vaultId, secretAlias, domain)) ?? null;
  }

  async list(vaultId: VaultId, secretAlias?: string): Promise<readonly SecretDestinationGrant[]> {
    return Array.from(this._grants.values()).filter((grant) => {
      if (grant.vaultId.value !== vaultId.value) return false;
      if (secretAlias && grant.secretAlias !== secretAlias) return false;
      return true;
    });
  }

  async delete(vaultId: VaultId, secretAlias: string, domain: string): Promise<void> {
    this._grants.delete(this._key(vaultId, secretAlias, domain));
  }
}

/**
 * @internal
 */
export class InMemoryCustomHttpFlowRegistry implements CustomHttpFlowRegistry {
  private readonly _flows = new Map<string, CustomHttpFlowDefinition>();

  async register(flow: CustomHttpFlowDefinition): Promise<void> {
    this._flows.set(`${flow.vaultId.value}:${flow.flowId}`, flow);
  }

  async get(vaultId: VaultId, flowId: string): Promise<CustomHttpFlowDefinition | null> {
    return this._flows.get(`${vaultId.value}:${flowId}`) ?? null;
  }
}

export class InMemoryRequestRecordRegistry implements RequestRecordRegistry {
  private readonly _records = new Map<string, RequestRecord>();

  async save(record: RequestRecord): Promise<void> {
    this._records.set(`${record.vaultId.value}:${record.requestId}`, record);
  }

  async get(vaultId: VaultId, requestId: string): Promise<RequestRecord | null> {
    return this._records.get(`${vaultId.value}:${requestId}`) ?? null;
  }

  async list(vaultId: VaultId, agentId?: string): Promise<readonly RequestRecord[]> {
    return Array.from(this._records.values()).filter((record) => {
      if (record.vaultId.value !== vaultId.value) return false;
      if (agentId && record.agentId !== agentId) return false;
      return true;
    });
  }
}

/**
 * @internal
 */
export class DefaultPolicyEngine implements PolicyEngine {
  constructor(private readonly _options: DefaultPolicyEngineOptions = {}) {}

  private validateRequestedAt(requestedAt: string, fieldName: string): void {
    const parsed = Date.parse(requestedAt);
    if (Number.isNaN(parsed)) {
      throw new VaultCoreError(`${fieldName} invalid`, "VAULT_WRITE_DENIED");
    }
  }

  private async isTrustedIssuer(issuerId: string): Promise<boolean> {
    if (this._options.trustedIssuerIdResolver) {
      return await this._options.trustedIssuerIdResolver(issuerId);
    }
    if (this._options.trustedIssuerIds) {
      return this._options.trustedIssuerIds.includes(issuerId);
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
    this.validateRequestedAt(command.requestedAt, "requestedAt");
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

  async issue(agentId: string): Promise<string> {
    const token = `sat_${crypto.randomBytes(16).toString("hex")}`;
    this._tokens.set(token, {
      token,
      agentId,
      issuedAt: new Date().toISOString(),
    });
    return token;
  }

  async verify(token: string, agentId: string): Promise<boolean> {
    const stored = this._tokens.get(token);
    if (!stored) return false;
    return stored.agentId === agentId;
  }

  async revoke(token: string): Promise<void> {
    this._tokens.delete(token);
  }

  async list(agentId?: string): Promise<readonly StoredSessionToken[]> {
    const tokens = [...this._tokens.values()];
    return agentId ? tokens.filter((token) => token.agentId === agentId) : tokens;
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
    private _sessionTokens: ISessionTokenRegistry,
    options: SignatureAgentProofVerifierOptions = {},
  ) {
    this._maxSkewMs = options.maxSkewMs ?? (5 * 60 * 1000);
    this._now = options.now ?? (() => new Date());
  }

  async verify(request: DispatchRequest): Promise<void> {
    const { vaultId, agent, proof, requestId, requestedAt } = request;
    if (proof.agentId !== agent.id) {
      throw new VaultCoreError("agent identity mismatch", "VAULT_DISPATCH_DENIED");
    }

    // Try token authentication first
    if (proof.token) {
      const valid = await this._sessionTokens.verify(proof.token, proof.agentId);
      if (valid) {
        return; // Token is valid, skip signature check
      }
      throw new VaultCoreError("invalid or expired session token", "VAULT_DISPATCH_DENIED");
    }

    // Fallback to signature authentication
    if (!proof.signature) {
      throw new VaultCoreError("missing agent proof (signature or token required)", "VAULT_DISPATCH_DENIED");
    }

    if (proof.requestId !== requestId || proof.requestedAt !== requestedAt) {
      throw new VaultCoreError("proof binding mismatch", "VAULT_DISPATCH_DENIED");
    }

    const parsedRequestedAt = Date.parse(requestedAt);
    const now = this._now().getTime();
    const maxSkewMs = this._maxSkewMs;

    if (Number.isNaN(parsedRequestedAt) || Math.abs(now - parsedRequestedAt) > maxSkewMs) {
      throw new VaultCoreError("proof timestamp out of range", "VAULT_DISPATCH_DENIED");
    }

    const identity = await this._identities.get(vaultId, proof.agentId);
    if (!identity) {
      throw new VaultCoreError("agent identity not registered", "VAULT_DISPATCH_DENIED");
    }

    const binding = createDispatchBinding(request);
    if (!verifySignature(identity.publicKey, proof.signature, binding)) {
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
    const replayKey = `${request.agent.id}:${request.requestId}`;
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
      const response = await this._fetchImpl(instruction.targetUrl, {
        method: instruction.method,
        headers: {
          ...(instruction.headers ?? {}),
          [this._authHeaderName]: `${this._authPrefix}${secret.plaintext}`,
        },
        body: instruction.body,
      });
      return {
        vaultId: instruction.vaultId,
        requestId: instruction.requestId,
        status: response.ok ? DispatchStatus.SUCCEEDED : DispatchStatus.FAILED,
        targetUrl: instruction.targetUrl,
        method: instruction.method,
        responseStatus: response.status,
        responseBody: await response.text(),
        error: response.ok ? undefined : `HTTP_${response.status}`,
      };
    } catch (error) {
      return {
        vaultId: instruction.vaultId,
        requestId: instruction.requestId,
        status: DispatchStatus.FAILED,
        targetUrl: instruction.targetUrl,
        method: instruction.method,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export interface VaultCoreDependenciesOptions {
  vaultId?: string;
  fetchImpl?: typeof fetch;
  authHeaderName?: string;
  authPrefix?: string;
  policy?: DefaultPolicyEngineOptions;
  proofVerifier?: SignatureAgentProofVerifierOptions;
  replayGuard?: ReplayGuard;
  sessionTokens?: ISessionTokenRegistry;
  clock?: Clock;
}

export function createVaultCoreDependencies(
  options: VaultCoreDependenciesOptions = {},
): VaultCoreDependencies {
  const agentIdentities = new InMemoryAgentIdentityRegistry();
  const sessionTokens = options.sessionTokens ?? new InMemorySessionTokenRegistry();
  return {
    vaultId: { value: options.vaultId ?? `vault_${crypto.randomUUID()}` },
    secrets: new InMemorySecretRepository(),
    custody: new InMemorySecretCustody(),
    policy: new DefaultPolicyEngine(options.policy),
    audit: new InMemoryAuditLog(),
    executor: new HttpDispatchExecutor(
      options.fetchImpl,
      options.authHeaderName,
      options.authPrefix,
    ),
    agentIdentities,
    agentProofVerifier: new SignatureAgentProofVerifier(agentIdentities, sessionTokens, options.proofVerifier),
    agentSecretGrants: new InMemoryAgentSecretGrantRegistry(),
    secretDestinationGrants: new InMemorySecretDestinationGrantRegistry(),
    requests: new InMemoryRequestRecordRegistry(),
    customFlows: new InMemoryCustomHttpFlowRegistry(),
    replayGuard: options.replayGuard ?? new InMemoryReplayGuard(),
    sessionTokens,
    clock: options.clock ?? new SystemClock(),
    ids: new RandomIdGenerator(),
  };
}
