import * as crypto from "node:crypto";
import {
  createAgentIdValue,
  createAuditEntryIdValue,
  createCapabilityIdValue,
  createFlowIdValue,
  createRequestIdValue,
  createSecretIdValue,
  createVersionIdValue,
} from "../internal/id-factory.js";
import { verifySignature } from "../protocol/crypto.js";
import type {
  AgentCapability,
  CapabilityStateRecord,
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
  CapabilityRevocationRegistry,
  CustomHttpFlowRegistry,
  PolicyEngine,
  RateLimitStore,
  TrustedExecutor,
  VaultCoreDependencies,
} from "./ports.js";
import {
  AgentIdentityRegistry,
  AgentProofVerifier,
  CapabilityStateRegistry,
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
  capabilityRevocationRegistry?: CapabilityRevocationRegistry;
  rateLimitStore?: RateLimitStore;
}

export interface SignatureAgentProofVerifierOptions {
  maxSkewMs?: number;
  now?: () => Date;
}

interface CanonicalHttpTarget {
  origin: string;
  url: string;
  method: string;
  path: string;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

function canonicalizeHttpTarget(targetUrl: string, method: string): CanonicalHttpTarget {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new VaultCoreError("target normalization failed", "VAULT_DISPATCH_DENIED");
  }
  if (parsed.username || parsed.password) {
    throw new VaultCoreError("target credentials not allowed", "VAULT_DISPATCH_DENIED");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new VaultCoreError("target scheme denied", "VAULT_DISPATCH_DENIED");
  }
  if (!parsed.hostname) {
    throw new VaultCoreError("target hostname missing", "VAULT_DISPATCH_DENIED");
  }
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.hash = "";
  parsed.search = "";
  if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
    parsed.port = "";
  }
  const path = parsed.pathname || "/";
  parsed.pathname = path;
  return {
    origin: parsed.origin,
    url: parsed.toString(),
    method: method.toUpperCase(),
    path,
  };
}

function matchesScope(scope: string, targetUrl: string): boolean {
  if (scope.endsWith("*")) {
    return canonicalRequestPrefix(scope).startsWith("__INVALID__")
      ? false
      : canonicalizeHttpTarget(targetUrl, "GET").url.startsWith(canonicalRequestPrefix(scope));
  }
  return canonicalizeAllowedTarget(scope) === canonicalizeHttpTarget(targetUrl, "GET").url;
}

function canonicalizeAllowedTarget(targetUrl: string): string {
  return canonicalizeHttpTarget(targetUrl, "GET").url;
}

function canonicalRequestPrefix(scope: string): string {
  try {
    return canonicalizeAllowedTarget(scope.slice(0, -1));
  } catch {
    return "__INVALID__";
  }
}

function createDispatchBinding(request: DispatchRequest): string {
  return JSON.stringify({
    requestId: request.requestId,
    requestedAt: request.requestedAt,
    agentId: request.agent.id,
    capabilityId: request.capability?.capabilityId ?? null,
    secretId: request.secretId ?? null,
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

  newCapabilityId(): string {
    return createCapabilityIdValue();
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
    return record?.retiredAt ? null : record;
  }

  async getById(secretId: SecretId): Promise<SecretRecord | null> {
    return this._byId.get(secretId.value) ?? null;
  }

  async list(vaultId: VaultId): Promise<readonly SecretRecord[]> {
    return Array.from(this._byId.values()).filter((record) => record.vaultId.value === vaultId.value && !record.retiredAt);
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
export class InMemoryCapabilityRevocationRegistry implements CapabilityRevocationRegistry {
  private readonly _versions = new Map<string, number>();

  revoke(vaultId: VaultId, agentId: string, capabilityId: string): number {
    const key = `${vaultId.value}:${agentId}:${capabilityId}`;
    const next = (this._versions.get(key) ?? 0) + 1;
    this._versions.set(key, next);
    return next;
  }

  get(vaultId: VaultId, agentId: string, capabilityId: string): number {
    return this._versions.get(`${vaultId.value}:${agentId}:${capabilityId}`) ?? 0;
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

/**
 * @internal
 */
export class InMemoryCapabilityRegistry implements CapabilityStateRegistry {
  private readonly _capabilities = new Map<string, CapabilityStateRecord>();

  async upsert(capability: CapabilityStateRecord): Promise<void> {
    for (const [key, candidate] of this._capabilities.entries()) {
      const sameRequest = capability.requestId && candidate.requestId === capability.requestId;
      const sameCapability = capability.capabilityId && candidate.capabilityId === capability.capabilityId;
      if (candidate.vaultId.value === capability.vaultId.value && candidate.agentId === capability.agentId && (sameRequest || sameCapability)) {
        this._capabilities.delete(key);
      }
    }
    this._capabilities.set(
      `${capability.vaultId.value}:${capability.agentId}:${capability.capabilityId ?? capability.requestId ?? "state"}`,
      capability,
    );
  }

  async getByCapabilityId(vaultId: VaultId, agentId: string, capabilityId: string): Promise<CapabilityStateRecord | null> {
    return this._capabilities.get(`${vaultId.value}:${agentId}:${capabilityId}`) ?? null;
  }

  async getByRequestId(vaultId: VaultId, requestId: string): Promise<CapabilityStateRecord | null> {
    return Array.from(this._capabilities.values()).find((record) =>
      record.vaultId.value === vaultId.value && record.requestId === requestId,
    ) ?? null;
  }

  async deleteByRequestId(vaultId: VaultId, requestId: string): Promise<void> {
    for (const [key, record] of this._capabilities.entries()) {
      if (record.vaultId.value === vaultId.value && record.requestId === requestId) {
        this._capabilities.delete(key);
      }
    }
  }

  async list(vaultId: VaultId, agentId?: string): Promise<readonly CapabilityStateRecord[]> {
    const prefix = `${vaultId.value}:`;
    const agentPrefix = agentId ? `${prefix}${agentId}:` : prefix;
    return Array.from(this._capabilities.entries())
      .filter(([key]) => key.startsWith(agentPrefix))
      .map(([, capability]) => capability);
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
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly _buckets = new Map<string, RateLimitBucket>();

  async consume(key: string, maxRequests: number, windowMs: number, nowMs: number): Promise<void> {
    const current = this._buckets.get(key);
    if (!current || nowMs >= current.resetAt) {
      this._buckets.set(key, {
        count: 1,
        resetAt: nowMs + windowMs,
      });
      return;
    }
    if (current.count >= maxRequests) {
      throw new VaultCoreError("capability rate limit exceeded", "VAULT_DISPATCH_DENIED");
    }
    current.count += 1;
  }
}

/**
 * @internal
 */
export class DefaultPolicyEngine implements PolicyEngine {
  private readonly _rateLimitStore: RateLimitStore;

  constructor(private readonly _options: DefaultPolicyEngineOptions = {}) {
    this._rateLimitStore = this._options.rateLimitStore ?? new InMemoryRateLimitStore();
  }

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

  private async assertCapabilityRateLimit(request: DispatchRequest): Promise<void> {
    const rateLimit = request.capability?.rateLimit;
    if (!rateLimit) {
      return;
    }
    if (!Number.isInteger(rateLimit.maxRequests) || rateLimit.maxRequests <= 0) {
      throw new VaultCoreError("capability rate limit invalid", "VAULT_DISPATCH_DENIED");
    }
    if (!Number.isInteger(rateLimit.windowMs) || rateLimit.windowMs <= 0) {
      throw new VaultCoreError("capability rate limit invalid", "VAULT_DISPATCH_DENIED");
    }
    const now = this._options.now?.().getTime() ?? Date.now();
    const key = `${request.vaultId.value}:${request.agent.id}:${request.capability?.capabilityId}`;
    await this._rateLimitStore.consume(key, rateLimit.maxRequests, rateLimit.windowMs, now);
  }

  async authorizeWrite(command: import("./contracts.js").VaultWriteSecretCommand): Promise<void> {
    if (!command.alias.trim()) {
      throw new VaultCoreError("secret alias required", "VAULT_WRITE_DENIED");
    }
    if (!command.plaintext) {
      throw new VaultCoreError("secret plaintext required", "VAULT_WRITE_DENIED");
    }
    this.validateRequestedAt(command.requestedAt, "requestedAt");
    if (command.kind === "owner.write_secret") return;
    if (command.issuer.id !== command.issuerSiteId) {
      throw new VaultCoreError("issuer identity mismatch", "VAULT_WRITE_DENIED");
    }
    if (!await this.isTrustedIssuer(command.issuer.id)) {
      throw new VaultCoreError("trusted issuer required", "VAULT_WRITE_DENIED");
    }
  }

  async authorizeDispatch(request: DispatchRequest, record?: SecretRecord | null): Promise<void> {
    const { capability } = request;
    if (!capability) {
      throw new VaultCoreError("capability required for authorization", "VAULT_DISPATCH_DENIED");
    }

    const now = this._options.now?.() ?? new Date();
    const canonicalRequestTarget = canonicalizeHttpTarget(request.targetUrl, request.method);
    if (capability.vaultId.value !== request.vaultId.value) {
      throw new VaultCoreError("capability vault mismatch", "VAULT_DISPATCH_DENIED");
    }
    if (record && record.vaultId.value !== request.vaultId.value) {
      throw new VaultCoreError("record vault mismatch", "VAULT_DISPATCH_DENIED");
    }
    if (capability.expiresAt) {
      const expiresAt = Date.parse(capability.expiresAt);
      if (Number.isNaN(expiresAt) || expiresAt < now.getTime()) {
        throw new VaultCoreError("capability expired", "VAULT_DISPATCH_DENIED");
      }
    }
    if (capability.agentId !== request.agent.id) {
      throw new VaultCoreError("capability agent mismatch", "VAULT_DISPATCH_DENIED");
    }
    if (capability.operation !== "dispatch_http" && capability.operation !== "custom_http") {
      throw new VaultCoreError("operation denied", "VAULT_DISPATCH_DENIED");
    }
    const issuedAt = Date.parse(capability.issuedAt);
    if (Number.isNaN(issuedAt) || issuedAt > now.getTime()) {
      throw new VaultCoreError("capability issuedAt invalid", "VAULT_DISPATCH_DENIED");
    }
    if (record) {
      if (capability.write.secretIds?.length) {
        if (!capability.write.secretIds.includes(record.secretId.value)) {
          throw new VaultCoreError("secret id denied", "VAULT_DISPATCH_DENIED");
        }
      }
    } else {
      if (capability.operation !== "custom_http") {
        throw new VaultCoreError("secret id required", "VAULT_DISPATCH_DENIED");
      }
      if (capability.write.secretIds?.length) {
        throw new VaultCoreError("secret scope denied", "VAULT_DISPATCH_DENIED");
      }
    }
    if (!matchesScope(capability.write.scope, request.targetUrl)) {
      throw new VaultCoreError("scope denied", "VAULT_DISPATCH_DENIED");
    }
    if (!capability.write.methods.includes(canonicalRequestTarget.method)) {
      throw new VaultCoreError("method denied", "VAULT_DISPATCH_DENIED");
    }
    const currentRevocationVersion = this._options.capabilityRevocationRegistry
      ? await this._options.capabilityRevocationRegistry.get(
        capability.vaultId,
        capability.agentId,
        capability.capabilityId,
      )
      : 0;
    if ((capability.revocationVersion ?? 0) < currentRevocationVersion) {
      throw new VaultCoreError("capability revoked", "VAULT_DISPATCH_DENIED");
    }
    await this.assertCapabilityRateLimit(request);
  }

  async revokeCapability(vaultId: VaultId, agentId: string, capabilityId: string): Promise<number> {
    if (!this._options.capabilityRevocationRegistry) {
      throw new VaultCoreError("revocation not supported", "VAULT_DISPATCH_DENIED");
    }
    return await this._options.capabilityRevocationRegistry.revoke(vaultId, agentId, capabilityId);
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
}

export interface SignatureAgentProofVerifierOptions {
  maxSkewMs?: number;
  now?: () => Date;
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
    const { vaultId, agent, capability, proof, requestId, requestedAt } = request;
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
  const sessionTokens = new InMemorySessionTokenRegistry();
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
    capabilityStates: new InMemoryCapabilityRegistry(),
    requests: new InMemoryRequestRecordRegistry(),
    customFlows: new InMemoryCustomHttpFlowRegistry(),
    replayGuard: options.replayGuard ?? new InMemoryReplayGuard(),
    sessionTokens: options.sessionTokens ?? new InMemorySessionTokenRegistry(),
    clock: options.clock ?? new SystemClock(),
    ids: new RandomIdGenerator(),
  };
}
