import * as crypto from "node:crypto";
import { verifySignature } from "../protocol/crypto.js";
import type {
  AgentCapability,
  AgentIdentityRecord,
  OwnerAuditRequest,
  OwnerExportSecretRequest,
  OwnerRegisterCapabilityCommand,
  OwnerRegisterAgentIdentityCommand,
  OwnerRegisterCustomHttpFlowCommand,
  OwnerIdentityRecord,
  AuditEntry,
  AuditQuery,
  CustomHttpFlowDefinition,
  VaultTargetBinding,
  DispatchInstruction,
  DispatchRequest,
  DispatchResult,
  SecretAlias,
  SecretId,
  SecretRecord,
  VaultId,
} from "./contracts.js";
import { VaultCoreError } from "./errors.js";
import { DispatchStatus } from "./contracts.js";
import type {
  AgentIdentityRegistry,
  AgentProofVerifier,
  AuditLog,
  CapabilityRegistry,
  CustomHttpFlowRegistry,
  CapabilityRevocationRegistry,
  Clock,
  IdGenerator,
  OwnerIdentityRegistry,
  OwnerProofVerifier,
  PolicyEngine,
  RateLimitStore,
  ReplayGuard,
  SecretCustody,
  SecretRepository,
  TrustedExecutor,
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

function canonicalizeAllowedTarget(targetUrl: string): string {
  return canonicalizeHttpTarget(targetUrl, "GET").url;
}

function createDispatchBinding(request: DispatchRequest): string {
  return JSON.stringify({
    requestId: request.requestId,
    requestedAt: request.requestedAt,
    agentId: request.agent.id,
    capabilityId: request.capability.capabilityId,
    secretAlias: request.secretAlias ?? null,
    targetUrl: request.targetUrl,
    method: request.method,
    body: request.body ?? null,
  });
}

function createOwnerWriteBinding(
  command: Extract<import("./contracts.js").VaultWriteSecretCommand, { kind: "owner.write_secret" }>,
): string {
  return JSON.stringify({
    requestId: command.requestId,
    requestedAt: command.requestedAt,
    ownerId: command.owner.id,
    alias: command.alias,
    plaintext: command.plaintext,
    targetBindings: command.targetBindings,
  });
}

function createOwnerDefineSecretTargetsBinding(
  command: import("./contracts.js").OwnerDefineSecretTargetsCommand,
): string {
  return JSON.stringify({
    requestId: command.requestId,
    requestedAt: command.requestedAt,
    ownerId: command.owner.id,
    alias: command.alias,
    targetBindings: command.targetBindings,
  });
}

function createOwnerAuditBinding(request: OwnerAuditRequest): string {
  return JSON.stringify({
    requestId: request.requestId,
    requestedAt: request.requestedAt,
    ownerId: request.actor.id,
    query: request.query,
  });
}

function createOwnerExportBinding(request: OwnerExportSecretRequest): string {
  return JSON.stringify({
    requestId: request.requestId,
    requestedAt: request.requestedAt,
    ownerId: request.actor.id,
    alias: request.alias,
  });
}

function createOwnerDeleteSecretBinding(command: import("./contracts.js").OwnerDeleteSecretCommand): string {
  return JSON.stringify({
    requestId: command.requestId,
    requestedAt: command.requestedAt,
    ownerId: command.owner.id,
    alias: command.alias,
  });
}

function createOwnerRegisterAgentBinding(command: OwnerRegisterAgentIdentityCommand): string {
  return JSON.stringify({
    requestId: command.requestId,
    requestedAt: command.requestedAt,
    ownerId: command.owner.id,
    agentIdentity: command.agentIdentity,
  });
}

function createOwnerRegisterCustomFlowBinding(command: OwnerRegisterCustomHttpFlowCommand): string {
  return JSON.stringify({
    requestId: command.requestId,
    requestedAt: command.requestedAt,
    ownerId: command.owner.id,
    flow: command.flow,
  });
}

function createOwnerRegisterCapabilityBinding(command: OwnerRegisterCapabilityCommand): string {
  return JSON.stringify({
    requestId: command.requestId,
    requestedAt: command.requestedAt,
    ownerId: command.owner.id,
    capability: command.capability,
  });
}

function createOwnerRevokeCapabilityBinding(command: import("./contracts.js").OwnerRevokeCapabilityCommand): string {
  return JSON.stringify({
    requestId: command.requestId,
    requestedAt: command.requestedAt,
    ownerId: command.owner.id,
    agentId: command.agentId,
    capabilityId: command.capabilityId,
  });
}

function createOwnerListAgentsBinding(request: import("./contracts.js").OwnerListAgentsRequest): string {
  return JSON.stringify({
    requestId: request.requestId,
    requestedAt: request.requestedAt,
    ownerId: request.actor.id,
  });
}

function createOwnerListCapabilitiesBinding(request: import("./contracts.js").OwnerListCapabilitiesRequest): string {
  return JSON.stringify({
    requestId: request.requestId,
    requestedAt: request.requestedAt,
    ownerId: request.actor.id,
    agentId: request.agentId ?? null,
  });
}

export class SystemClock implements Clock {
  nowIso(): string {
    return new Date().toISOString();
  }
}

export class RandomIdGenerator implements IdGenerator {
  newSecretId(): SecretId {
    return { value: `secret_${crypto.randomUUID()}` };
  }

  newVersion(): { value: string } {
    return { value: `v_${crypto.randomUUID()}` };
  }

  newAuditEntryId(): string {
    return `audit_${crypto.randomUUID()}`;
  }
}

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
    return this._byAlias.get(alias.value) ?? null;
  }

  async getById(secretId: SecretId): Promise<SecretRecord | null> {
    return this._byId.get(secretId.value) ?? null;
  }
}

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

export class InMemoryOwnerIdentityRegistry implements OwnerIdentityRegistry {
  private readonly _identities = new Map<string, OwnerIdentityRecord>();

  async register(identity: OwnerIdentityRecord): Promise<void> {
    this._identities.set(`${identity.vaultId.value}:${identity.ownerId}`, identity);
  }

  async get(vaultId: VaultId, ownerId: string): Promise<OwnerIdentityRecord | null> {
    return this._identities.get(`${vaultId.value}:${ownerId}`) ?? null;
  }

  async hasAny(vaultId: VaultId): Promise<boolean> {
    const prefix = `${vaultId.value}:`;
    return Array.from(this._identities.keys()).some((key) => key.startsWith(prefix));
  }
}

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

export class InMemoryCustomHttpFlowRegistry implements CustomHttpFlowRegistry {
  private readonly _flows = new Map<string, CustomHttpFlowDefinition>();

  async register(flow: CustomHttpFlowDefinition): Promise<void> {
    this._flows.set(`${flow.vaultId.value}:${flow.flowId}`, flow);
  }

  async get(vaultId: VaultId, flowId: string): Promise<CustomHttpFlowDefinition | null> {
    return this._flows.get(`${vaultId.value}:${flowId}`) ?? null;
  }
}

export class InMemoryCapabilityRegistry implements CapabilityRegistry {
  private readonly _capabilities = new Map<string, AgentCapability>();

  async register(capability: AgentCapability): Promise<void> {
    this._capabilities.set(
      `${capability.vaultId.value}:${capability.agentId}:${capability.capabilityId}`,
      capability,
    );
  }

  async get(vaultId: VaultId, agentId: string, capabilityId: string): Promise<AgentCapability | null> {
    return this._capabilities.get(`${vaultId.value}:${agentId}:${capabilityId}`) ?? null;
  }

  async list(vaultId: VaultId, agentId?: string): Promise<readonly AgentCapability[]> {
    const prefix = `${vaultId.value}:`;
    const agentPrefix = agentId ? `${prefix}${agentId}:` : prefix;
    return Array.from(this._capabilities.entries())
      .filter(([key]) => key.startsWith(agentPrefix))
      .map(([, capability]) => capability);
  }
}

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

  private validateTargetBindings(bindings: readonly VaultTargetBinding[], code: "VAULT_WRITE_DENIED" | "VAULT_DISPATCH_DENIED"): void {
    if (bindings.length === 0) {
      throw new VaultCoreError("target bindings required", code);
    }
    for (const binding of bindings) {
      if (!binding.targetId?.trim()) {
        throw new VaultCoreError("target binding id required", code);
      }
      if (binding.kind === "site") {
        if (!binding.targetUrl) {
          throw new VaultCoreError("site target url required", code);
        }
        canonicalizeAllowedTarget(binding.targetUrl);
      }
      if (binding.methods?.length === 0) {
        throw new VaultCoreError("empty target methods denied", code);
      }
      if (binding.paths?.length === 0) {
        throw new VaultCoreError("empty target paths denied", code);
      }
    }
  }

  private async assertCapabilityRateLimit(request: DispatchRequest): Promise<void> {
    const rateLimit = request.capability.rateLimit;
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
    const key = `${request.vaultId.value}:${request.agent.id}:${request.capability.capabilityId}`;
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
    if (command.kind === "owner.write_secret") {
      if (!command.owner.id.trim()) {
        throw new VaultCoreError("owner id required", "VAULT_WRITE_DENIED");
      }
      if (command.targetBindings?.length) {
        this.validateTargetBindings(command.targetBindings, "VAULT_WRITE_DENIED");
      }
      return;
    }
    if (command.issuer.id !== command.issuerSiteId) {
      throw new VaultCoreError("issuer identity mismatch", "VAULT_WRITE_DENIED");
    }
    if (!await this.isTrustedIssuer(command.issuer.id)) {
      throw new VaultCoreError("trusted issuer required", "VAULT_WRITE_DENIED");
    }
    if (!command.targetBindings?.length) {
      throw new VaultCoreError("trusted issuer target bindings required", "VAULT_WRITE_DENIED");
    }
    this.validateTargetBindings(command.targetBindings, "VAULT_WRITE_DENIED");
  }

  async authorizeDefineSecretTargets(command: import("./contracts.js").OwnerDefineSecretTargetsCommand): Promise<void> {
    if (!command.owner.id.trim()) {
      throw new VaultCoreError("owner id required", "VAULT_WRITE_DENIED");
    }
    if (!command.alias.trim()) {
      throw new VaultCoreError("secret alias required", "VAULT_WRITE_DENIED");
    }
    this.validateRequestedAt(command.requestedAt, "requestedAt");
    if (command.targetBindings.length > 0) {
      this.validateTargetBindings(command.targetBindings, "VAULT_WRITE_DENIED");
    }
  }

  async authorizeDispatch(request: DispatchRequest, record?: SecretRecord | null): Promise<void> {
    const now = this._options.now?.() ?? new Date();
    const canonicalRequestTarget = canonicalizeHttpTarget(request.targetUrl, request.method);
    if (request.capability.vaultId.value !== request.vaultId.value) {
      throw new VaultCoreError("capability vault mismatch", "VAULT_DISPATCH_DENIED");
    }
    if (record && record.vaultId.value !== request.vaultId.value) {
      throw new VaultCoreError("record vault mismatch", "VAULT_DISPATCH_DENIED");
    }
    if (request.capability.expiresAt) {
      const expiresAt = Date.parse(request.capability.expiresAt);
      if (Number.isNaN(expiresAt) || expiresAt < now.getTime()) {
        throw new VaultCoreError("capability expired", "VAULT_DISPATCH_DENIED");
      }
    }
    if (request.capability.agentId !== request.agent.id) {
      throw new VaultCoreError("capability agent mismatch", "VAULT_DISPATCH_DENIED");
    }
    if (request.capability.operation !== "dispatch_http" && request.capability.operation !== "custom_http") {
      throw new VaultCoreError("operation denied", "VAULT_DISPATCH_DENIED");
    }
    const issuedAt = Date.parse(request.capability.issuedAt);
    if (Number.isNaN(issuedAt) || issuedAt > now.getTime()) {
      throw new VaultCoreError("capability issuedAt invalid", "VAULT_DISPATCH_DENIED");
    }
    if (record) {
      if (request.capability.secretIds?.length) {
        if (!request.capability.secretIds.includes(record.secretId.value)) {
          throw new VaultCoreError("secret id denied", "VAULT_DISPATCH_DENIED");
        }
      } else if (request.capability.secretAliases?.length && !request.capability.secretAliases.includes(record.alias.value)) {
        throw new VaultCoreError("secret alias denied", "VAULT_DISPATCH_DENIED");
      }
    } else {
      if (request.capability.operation !== "custom_http") {
        throw new VaultCoreError("secret alias required", "VAULT_DISPATCH_DENIED");
      }
      if (request.capability.secretIds?.length || request.capability.secretAliases?.length) {
        throw new VaultCoreError("secret scope denied", "VAULT_DISPATCH_DENIED");
      }
    }
    if (!request.capability.allowedTargets.some((target) => canonicalizeAllowedTarget(target) === canonicalRequestTarget.url)) {
      throw new VaultCoreError("target denied", "VAULT_DISPATCH_DENIED");
    }
    if (!request.capability.allowedMethods.includes(canonicalRequestTarget.method)) {
      throw new VaultCoreError("method denied", "VAULT_DISPATCH_DENIED");
    }
    if (request.capability.allowedPaths?.length && !request.capability.allowedPaths.includes(canonicalRequestTarget.path)) {
      throw new VaultCoreError("path denied", "VAULT_DISPATCH_DENIED");
    }
    const currentRevocationVersion = this._options.capabilityRevocationRegistry
      ? await this._options.capabilityRevocationRegistry.get(
        request.capability.vaultId,
        request.capability.agentId,
        request.capability.capabilityId,
      )
      : 0;
    if ((request.capability.revocationVersion ?? 0) < currentRevocationVersion) {
      throw new VaultCoreError("capability revoked", "VAULT_DISPATCH_DENIED");
    }
    if (record) {
      const targetAllowed = record.targetBindings.some((binding) => {
        if (binding.kind === "owner") {
          return binding.targetId === canonicalRequestTarget.url;
        }
        if (binding.targetUrl && canonicalizeAllowedTarget(binding.targetUrl) !== canonicalRequestTarget.url) return false;
        if (binding.methods?.length && !binding.methods.includes(canonicalRequestTarget.method)) return false;
        if (binding.paths?.length && !binding.paths.includes(canonicalRequestTarget.path)) return false;
        return true;
      });
      if (!targetAllowed) {
        throw new VaultCoreError("record target denied", "VAULT_DISPATCH_DENIED");
      }
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

export class SignatureAgentProofVerifier implements AgentProofVerifier {
  private readonly _maxSkewMs: number;
  private readonly _now: () => Date;
  private readonly _agentIdentities: AgentIdentityRegistry;

  constructor(agentIdentities: AgentIdentityRegistry, options: SignatureAgentProofVerifierOptions = {}) {
    this._agentIdentities = agentIdentities;
    this._maxSkewMs = options.maxSkewMs ?? (5 * 60 * 1000);
    this._now = options.now ?? (() => new Date());
  }

  async verify(request: DispatchRequest): Promise<void> {
    if (request.proof.agentId !== request.agent.id) {
      throw new VaultCoreError("proof agent mismatch", "VAULT_DISPATCH_DENIED");
    }
    if (request.proof.requestId !== request.requestId || request.proof.requestedAt !== request.requestedAt) {
      throw new VaultCoreError("proof binding mismatch", "VAULT_DISPATCH_DENIED");
    }
    const requestedAt = Date.parse(request.requestedAt);
    if (Number.isNaN(requestedAt) || Math.abs(this._now().getTime() - requestedAt) > this._maxSkewMs) {
      throw new VaultCoreError("proof timestamp out of range", "VAULT_DISPATCH_DENIED");
    }
    const registeredIdentity = await this._agentIdentities.get(request.vaultId, request.agent.id);
    if (!registeredIdentity) {
      throw new VaultCoreError("agent identity not registered", "VAULT_DISPATCH_DENIED");
    }
    const binding = createDispatchBinding(request);
    if (!verifySignature(registeredIdentity.publicKey, request.proof.signature, binding)) {
      throw new VaultCoreError("invalid proof signature", "VAULT_DISPATCH_DENIED");
    }
  }
}

export class SignatureOwnerProofVerifier implements OwnerProofVerifier {
  private readonly _maxSkewMs: number;
  private readonly _now: () => Date;
  private readonly _ownerIdentities: OwnerIdentityRegistry;

  constructor(ownerIdentities: OwnerIdentityRegistry, options: SignatureAgentProofVerifierOptions = {}) {
    this._ownerIdentities = ownerIdentities;
    this._maxSkewMs = options.maxSkewMs ?? (5 * 60 * 1000);
    this._now = options.now ?? (() => new Date());
  }

  private async verifyBinding(ownerId: string, vaultId: VaultId, requestedAt: string, signature: string, binding: string): Promise<void> {
    const parsedRequestedAt = Date.parse(requestedAt);
    if (Number.isNaN(parsedRequestedAt) || Math.abs(this._now().getTime() - parsedRequestedAt) > this._maxSkewMs) {
      throw new VaultCoreError("owner proof timestamp out of range", "VAULT_AUDIT_DENIED");
    }
    const registeredIdentity = await this._ownerIdentities.get(vaultId, ownerId);
    if (!registeredIdentity) {
      throw new VaultCoreError("owner identity not registered", "VAULT_AUDIT_DENIED");
    }
    if (!verifySignature(registeredIdentity.publicKey, signature, binding)) {
      throw new VaultCoreError("invalid owner proof signature", "VAULT_AUDIT_DENIED");
    }
  }

  async verifyWrite(command: Extract<import("./contracts.js").VaultWriteSecretCommand, { kind: "owner.write_secret" }>): Promise<void> {
    if (command.proof.ownerId !== command.owner.id) {
      throw new VaultCoreError("owner proof identity mismatch", "VAULT_WRITE_DENIED");
    }
    if (command.proof.requestId !== command.requestId || command.proof.requestedAt !== command.requestedAt) {
      throw new VaultCoreError("owner proof binding mismatch", "VAULT_WRITE_DENIED");
    }
    const binding = createOwnerWriteBinding(command);
    try {
      await this.verifyBinding(command.owner.id, command.vaultId, command.requestedAt, command.proof.signature, binding);
    } catch (error) {
      if (error instanceof VaultCoreError && error.code === "VAULT_AUDIT_DENIED") {
        throw new VaultCoreError(error.message, "VAULT_WRITE_DENIED");
      }
      throw error;
    }
  }

  async verifyDefineSecretTargets(command: import("./contracts.js").OwnerDefineSecretTargetsCommand): Promise<void> {
    if (command.proof.ownerId !== command.owner.id) {
      throw new VaultCoreError("owner proof identity mismatch", "VAULT_WRITE_DENIED");
    }
    if (command.proof.requestId !== command.requestId || command.proof.requestedAt !== command.requestedAt) {
      throw new VaultCoreError("owner proof binding mismatch", "VAULT_WRITE_DENIED");
    }
    try {
      await this.verifyBinding(
        command.owner.id,
        command.vaultId,
        command.requestedAt,
        command.proof.signature,
        createOwnerDefineSecretTargetsBinding(command),
      );
    } catch (error) {
      if (error instanceof VaultCoreError && error.code === "VAULT_AUDIT_DENIED") {
        throw new VaultCoreError(error.message, "VAULT_WRITE_DENIED");
      }
      throw error;
    }
  }

  async verifyAudit(request: OwnerAuditRequest): Promise<void> {
    if (request.proof.ownerId !== request.actor.id) {
      throw new VaultCoreError("owner proof identity mismatch", "VAULT_AUDIT_DENIED");
    }
    if (request.proof.requestId !== request.requestId || request.proof.requestedAt !== request.requestedAt) {
      throw new VaultCoreError("owner proof binding mismatch", "VAULT_AUDIT_DENIED");
    }
    await this.verifyBinding(
      request.actor.id,
      request.vaultId,
      request.requestedAt,
      request.proof.signature,
      createOwnerAuditBinding(request),
    );
  }

  async verifyExport(request: OwnerExportSecretRequest): Promise<void> {
    if (request.proof.ownerId !== request.actor.id) {
      throw new VaultCoreError("owner proof identity mismatch", "VAULT_AUDIT_DENIED");
    }
    if (request.proof.requestId !== request.requestId || request.proof.requestedAt !== request.requestedAt) {
      throw new VaultCoreError("owner proof binding mismatch", "VAULT_AUDIT_DENIED");
    }
    await this.verifyBinding(
      request.actor.id,
      request.vaultId,
      request.requestedAt,
      request.proof.signature,
      createOwnerExportBinding(request),
    );
  }

  async verifyDeleteSecret(command: import("./contracts.js").OwnerDeleteSecretCommand): Promise<void> {
    if (command.proof.ownerId !== command.owner.id) {
      throw new VaultCoreError("owner proof identity mismatch", "VAULT_WRITE_DENIED");
    }
    if (command.proof.requestId !== command.requestId || command.proof.requestedAt !== command.requestedAt) {
      throw new VaultCoreError("owner proof binding mismatch", "VAULT_WRITE_DENIED");
    }
    try {
      await this.verifyBinding(
        command.owner.id,
        command.vaultId,
        command.requestedAt,
        command.proof.signature,
        createOwnerDeleteSecretBinding(command),
      );
    } catch (error) {
      if (error instanceof VaultCoreError && error.code === "VAULT_AUDIT_DENIED") {
        throw new VaultCoreError(error.message, "VAULT_WRITE_DENIED");
      }
      throw error;
    }
  }

  async verifyRegisterCapability(command: OwnerRegisterCapabilityCommand): Promise<void> {
    if (command.proof.ownerId !== command.owner.id) {
      throw new VaultCoreError("owner proof identity mismatch", "VAULT_IDENTITY_DENIED");
    }
    if (command.proof.requestId !== command.requestId || command.proof.requestedAt !== command.requestedAt) {
      throw new VaultCoreError("owner proof binding mismatch", "VAULT_IDENTITY_DENIED");
    }
    try {
      await this.verifyBinding(
        command.owner.id,
        command.vaultId,
        command.requestedAt,
        command.proof.signature,
        createOwnerRegisterCapabilityBinding(command),
      );
    } catch (error) {
      if (error instanceof VaultCoreError && error.code === "VAULT_AUDIT_DENIED") {
        throw new VaultCoreError(error.message, "VAULT_IDENTITY_DENIED");
      }
      throw error;
    }
  }

  async verifyRegisterAgentIdentity(command: OwnerRegisterAgentIdentityCommand): Promise<void> {
    if (command.proof.ownerId !== command.owner.id) {
      throw new VaultCoreError("owner proof identity mismatch", "VAULT_IDENTITY_DENIED");
    }
    if (command.proof.requestId !== command.requestId || command.proof.requestedAt !== command.requestedAt) {
      throw new VaultCoreError("owner proof binding mismatch", "VAULT_IDENTITY_DENIED");
    }
    try {
      await this.verifyBinding(
        command.owner.id,
        command.vaultId,
        command.requestedAt,
        command.proof.signature,
        createOwnerRegisterAgentBinding(command),
      );
    } catch (error) {
      if (error instanceof VaultCoreError && error.code === "VAULT_AUDIT_DENIED") {
        throw new VaultCoreError(error.message, "VAULT_IDENTITY_DENIED");
      }
      throw error;
    }
  }

  async verifyRegisterCustomFlow(command: OwnerRegisterCustomHttpFlowCommand): Promise<void> {
    if (command.proof.ownerId !== command.owner.id) {
      throw new VaultCoreError("owner proof identity mismatch", "VAULT_IDENTITY_DENIED");
    }
    if (command.proof.requestId !== command.requestId || command.proof.requestedAt !== command.requestedAt) {
      throw new VaultCoreError("owner proof binding mismatch", "VAULT_IDENTITY_DENIED");
    }
    try {
      await this.verifyBinding(
        command.owner.id,
        command.vaultId,
        command.requestedAt,
        command.proof.signature,
        createOwnerRegisterCustomFlowBinding(command),
      );
    } catch (error) {
      if (error instanceof VaultCoreError && error.code === "VAULT_AUDIT_DENIED") {
        throw new VaultCoreError(error.message, "VAULT_IDENTITY_DENIED");
      }
      throw error;
    }
  }

  async verifyRevokeCapability(command: import("./contracts.js").OwnerRevokeCapabilityCommand): Promise<void> {
    if (command.proof.ownerId !== command.owner.id) {
      throw new VaultCoreError("owner proof identity mismatch", "VAULT_IDENTITY_DENIED");
    }
    if (command.proof.requestId !== command.requestId || command.proof.requestedAt !== command.requestedAt) {
      throw new VaultCoreError("owner proof binding mismatch", "VAULT_IDENTITY_DENIED");
    }
    try {
      await this.verifyBinding(
        command.owner.id,
        command.vaultId,
        command.requestedAt,
        command.proof.signature,
        createOwnerRevokeCapabilityBinding(command),
      );
    } catch (error) {
      if (error instanceof VaultCoreError && error.code === "VAULT_AUDIT_DENIED") {
        throw new VaultCoreError(error.message, "VAULT_IDENTITY_DENIED");
      }
      throw error;
    }
  }

  async verifyListAgents(request: import("./contracts.js").OwnerListAgentsRequest): Promise<void> {
    if (request.proof.ownerId !== request.actor.id) {
      throw new VaultCoreError("owner proof identity mismatch", "VAULT_AUDIT_DENIED");
    }
    if (request.proof.requestId !== request.requestId || request.proof.requestedAt !== request.requestedAt) {
      throw new VaultCoreError("owner proof binding mismatch", "VAULT_AUDIT_DENIED");
    }
    await this.verifyBinding(
      request.actor.id,
      request.vaultId,
      request.requestedAt,
      request.proof.signature,
      createOwnerListAgentsBinding(request),
    );
  }

  async verifyListCapabilities(request: import("./contracts.js").OwnerListCapabilitiesRequest): Promise<void> {
    if (request.proof.ownerId !== request.actor.id) {
      throw new VaultCoreError("owner proof identity mismatch", "VAULT_AUDIT_DENIED");
    }
    if (request.proof.requestId !== request.requestId || request.proof.requestedAt !== request.requestedAt) {
      throw new VaultCoreError("owner proof binding mismatch", "VAULT_AUDIT_DENIED");
    }
    await this.verifyBinding(
      request.actor.id,
      request.vaultId,
      request.requestedAt,
      request.proof.signature,
      createOwnerListCapabilitiesBinding(request),
    );
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

export interface CreateDefaultVaultCoreDependenciesOptions {
  vaultId?: string;
  fetchImpl?: typeof fetch;
  authHeaderName?: string;
  authPrefix?: string;
  policy?: DefaultPolicyEngineOptions;
  proofVerifier?: SignatureAgentProofVerifierOptions;
}

export function createDefaultVaultCoreDependencies(
  options: CreateDefaultVaultCoreDependenciesOptions = {},
): {
  vaultId: VaultId;
  secrets: InMemorySecretRepository;
  custody: InMemorySecretCustody;
  policy: DefaultPolicyEngine;
  audit: InMemoryAuditLog;
  executor: HttpDispatchExecutor;
  agentIdentities: InMemoryAgentIdentityRegistry;
  ownerIdentities: InMemoryOwnerIdentityRegistry;
  proofVerifier: SignatureAgentProofVerifier;
  ownerProofVerifier: SignatureOwnerProofVerifier;
  customFlows: InMemoryCustomHttpFlowRegistry;
  capabilities: InMemoryCapabilityRegistry;
  replayGuard: InMemoryReplayGuard;
  clock: SystemClock;
  ids: RandomIdGenerator;
} {
  const agentIdentities = new InMemoryAgentIdentityRegistry();
  const ownerIdentities = new InMemoryOwnerIdentityRegistry();
  const vaultId = { value: options.vaultId ?? `vault_${crypto.randomUUID()}` };
  return {
    vaultId,
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
    ownerIdentities,
    proofVerifier: new SignatureAgentProofVerifier(agentIdentities, options.proofVerifier),
    ownerProofVerifier: new SignatureOwnerProofVerifier(ownerIdentities, options.proofVerifier),
    capabilities: new InMemoryCapabilityRegistry(),
    customFlows: new InMemoryCustomHttpFlowRegistry(),
    replayGuard: new InMemoryReplayGuard(options.proofVerifier),
    clock: new SystemClock(),
    ids: new RandomIdGenerator(),
  };
}
