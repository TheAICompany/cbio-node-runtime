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
  OwnerAuditSubscription,
  AgentIdentityRecord,
  AuditEntry,
  AuditQuery,
  OwnerPendingDispatchSubscription,
  PendingDispatchEvent,

  DispatchInstruction,
  DispatchRequest,
  DispatchResult,
  RequestRecord,
  SecretAlias,
  SecretId,
  SecretRecord,
  SessionTokenInspectionResult,
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
  private readonly _subscribers = new Map<string, Set<OwnerAuditSubscription>>();

  async append(entry: AuditEntry): Promise<void> {
    this._entries.push(entry);
    const subscribers = this._subscribers.get(entry.vault_id);
    if (!subscribers) return;
    for (const subscription of subscribers) {
      if (matchesAuditSubscription(entry, subscription)) {
        subscription.onEvent(entry);
      }
    }
  }

  async query(query: AuditQuery): Promise<readonly AuditEntry[]> {
    return this._entries.filter((entry) => {
      if (query.actor_id && entry.actor.id !== query.actor_id) return false;
      if (query.root_agent_id && entry.root_agent_id !== query.root_agent_id) return false;
      if (query.secret_alias && entry.secret_alias !== query.secret_alias) return false;
      if (query.request_id && entry.request_id !== query.request_id) return false;
      if (query.since && entry.ts < query.since) return false;
      return true;
    });
  }

  subscribe(vault_id: VaultId, subscription: OwnerAuditSubscription): () => void {
    const replay = this._entries
      .filter((entry) => entry.vault_id === vault_id.value)
      .filter((entry) => matchesAuditSubscription(entry, subscription))
      .sort((a, b) => a.event_id.localeCompare(b.event_id));

    for (const entry of replay) {
      subscription.onEvent(entry);
    }

    let subscribers = this._subscribers.get(vault_id.value);
    if (!subscribers) {
      subscribers = new Set();
      this._subscribers.set(vault_id.value, subscribers);
    }
    subscribers.add(subscription);

    return () => {
      const current = this._subscribers.get(vault_id.value);
      if (!current) return;
      current.delete(subscription);
      if (current.size === 0) this._subscribers.delete(vault_id.value);
    };
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
  private readonly _pendingSubscribers = new Map<string, Set<(event: PendingDispatchEvent) => void>>();

  async save(record: RequestRecord): Promise<void> {
    const key = `${record.vault_id.value}:${record.request_id}`;
    const previous = this._records.get(key);
    this._records.set(key, record);
    const event = this._toPendingDispatchEvent(record);
    if (event && previous?.pending_dispatch_event?.event_id !== event.event_id) {
      const subscribers = this._pendingSubscribers.get(record.vault_id.value);
      if (subscribers) {
        for (const callback of subscribers) callback(event);
      }
    }
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

  subscribePending(vault_id: VaultId, subscription: OwnerPendingDispatchSubscription): () => void {
    const replay = Array.from(this._records.values())
      .filter((record) => record.vault_id.value === vault_id.value)
      .map((record) => this._toPendingDispatchEvent(record))
      .filter((event): event is PendingDispatchEvent => !!event)
      .filter((event) => !subscription.afterEventId || event.event_id > subscription.afterEventId)
      .sort((a, b) => a.event_id.localeCompare(b.event_id));
    for (const event of replay) subscription.onEvent(event);

    let subscribers = this._pendingSubscribers.get(vault_id.value);
    if (!subscribers) {
      subscribers = new Set();
      this._pendingSubscribers.set(vault_id.value, subscribers);
    }
    subscribers.add(subscription.onEvent);

    return () => {
      const current = this._pendingSubscribers.get(vault_id.value);
      if (!current) return;
      current.delete(subscription.onEvent);
      if (current.size === 0) this._pendingSubscribers.delete(vault_id.value);
    };
  }

  private _toPendingDispatchEvent(record: RequestRecord): PendingDispatchEvent | null {
    if (record.execution.status !== DispatchStatus.AWAITING_APPROVAL || !record.pending_dispatch_event) {
      return null;
    }
    return {
      event_id: record.pending_dispatch_event.event_id,
      emitted_at: record.pending_dispatch_event.emitted_at,
      record,
    };
  }
}

function matchesAuditSubscription(entry: AuditEntry, subscription: OwnerAuditSubscription): boolean {
  if (subscription.afterEventId && entry.event_id <= subscription.afterEventId) {
    return false;
  }
  if (subscription.operations && !subscription.operations.includes(entry.operation)) {
    return false;
  }
  if (subscription.root_agent_id && entry.root_agent_id !== subscription.root_agent_id) {
    return false;
  }
  if (subscription.request_id && entry.request_id !== subscription.request_id) {
    return false;
  }
  return true;
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
  private readonly _tokensByAgentId = new Map<string, StoredSessionToken>();
  private readonly _agentIdByToken = new Map<string, string>();

  async issue(root_agent_id: string): Promise<string> {
    const existing = this._tokensByAgentId.get(root_agent_id);
    if (existing) {
      this._agentIdByToken.delete(existing.token);
    }
    const token = `sat_${crypto.randomBytes(16).toString("hex")}`;
    const stored = {
      token,
      root_agent_id,
      issued_at: new Date().toISOString(),
    };
    this._tokensByAgentId.set(root_agent_id, stored);
    this._agentIdByToken.set(token, root_agent_id);
    return token;
  }

  async inspect(token: string, root_agent_id: string): Promise<SessionTokenInspectionResult> {
    const stored = this._tokensByAgentId.get(root_agent_id);
    if (stored?.token === token) {
      return { ok: true, token: stored };
    }
    if (this._agentIdByToken.has(token)) {
      return { ok: false, reason: "agent_mismatch" };
    }
    return { ok: false, reason: "token_not_found" };
  }

  async revoke(token: string): Promise<void> {
    const root_agent_id = this._agentIdByToken.get(token);
    if (!root_agent_id) return;
    this._agentIdByToken.delete(token);
    const stored = this._tokensByAgentId.get(root_agent_id);
    if (stored?.token === token) {
      this._tokensByAgentId.delete(root_agent_id);
    }
  }

  async list(root_agent_id?: string): Promise<readonly StoredSessionToken[]> {
    if (root_agent_id) {
      const stored = this._tokensByAgentId.get(root_agent_id);
      return stored ? [stored] : [];
    }
    return [...this._tokensByAgentId.values()];
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
    private _sessionTokenRegistry: ISessionTokenRegistry,
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
      const inspection = await this._sessionTokenRegistry.inspect(proof.token, proof.root_agent_id);
      if (inspection.ok) {
        return; // Token is valid, skip signature check
      }
      if (inspection.reason === "agent_mismatch") {
        throw new VaultCoreError("session token does not belong to this agent", "VAULT_DISPATCH_DENIED");
      }
      throw new VaultCoreError("session token not found", "VAULT_DISPATCH_DENIED");
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
      const response_headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        response_headers[key] = value;
      });
      return {
        vault_id: instruction.vault_id,
        request_id: instruction.request_id,
        status: response.ok ? DispatchStatus.SUCCEEDED : DispatchStatus.FAILED,
        target_url: instruction.target_url,
        method: instruction.method,
        response_status: response.status,
        response_headers,
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
  sessionTokenRegistry?: ISessionTokenRegistry;
  clock?: Clock;
}

export function createVaultCoreDependencies(
  options: VaultCoreDependenciesOptions = {},
): VaultCoreDependencies {
  const agentRecords = new InMemoryAgentIdentityRegistry();
  const sessionTokenRegistry = options.sessionTokenRegistry ?? new InMemorySessionTokenRegistry();
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
    agentProofVerifier: new SignatureAgentProofVerifier(agentRecords, sessionTokenRegistry, options.proofVerifier),
    agent_secretGrants: new InMemoryAgentSecretGrantRegistry(),
    secret_destinationGrants: new InMemorySecretDestinationGrantRegistry(),
    requests: new InMemoryRequestRecordRegistry(),
    replayGuard: options.replayGuard ?? new InMemoryReplayGuard(),
    sessionTokenRegistry,
    clock: options.clock ?? new SystemClock(),
    ids: new RandomIdGenerator(),
  };
}
