import { createHash, randomBytes } from "node:crypto";
import { sealBlob, unsealBlob, SealedJsonRepository } from "../sealed/index.js";
import type { IStorageProvider } from "../storage/provider.js";
import type {
  AgentCapability,
  CapabilityStateRecord,
  AgentIdentityRecord,
  AuditEntry,
  AuditQuery,
  VaultId,
  CustomHttpFlowDefinition,
  SecretAlias,
  SecretId,
  SecretRecord,
  DispatchRequest,
} from "./contracts.js";
import type {
  AgentIdentityRegistry,
  AuditLog,
  CapabilityStateRegistry,
  CapabilityRevocationRegistry,
  CustomHttpFlowRegistry,
  RateLimitStore,
  ReplayGuard,
  SecretCustody,
  SecretRepository,
  VaultCoreDependencies,
} from "./ports.js";
import {
  InMemoryAgentIdentityRegistry,
  InMemoryAuditLog,
  InMemoryCapabilityRegistry,
  InMemoryCustomHttpFlowRegistry,
  InMemoryReplayGuard,
  InMemorySecretCustody,
  InMemorySecretRepository,
  InMemorySessionTokenRegistry,
  RandomIdGenerator,
  SignatureAgentProofVerifier,
  SystemClock,
} from "./defaults.js";
import {
  DefaultPolicyEngine,
  createVaultCoreDependencies,
  type VaultCoreDependenciesOptions,
} from "./defaults.js";
import { VaultCoreError } from "./errors.js";

interface PersistedSecretsState {
  records: SecretRecord[];
}

interface ReplayState {
  seen: Record<string, number>;
}

interface RateLimitState {
  buckets: Record<string, { count: number; resetAt: number }>;
}

interface RevocationState {
  versions: Record<string, number>;
}

interface CustomFlowState {
  flows: CustomHttpFlowDefinition[];
}

interface CapabilityState {
  capabilities: CapabilityStateRecord[];
}

interface AgentIdentityState {
  identities: AgentIdentityRecord[];
}


export const DEFAULT_VAULT_KEY_CUSTODY_BLOB_KEY = "working-key.sealed";

export interface InitializeVaultCustodyOptions {
  vaultWorkingKey?: string;
  vaultRecoveryKey?: string;
  storageKey?: string;
  overwrite?: boolean;
}

export interface InitializedVaultCustody {
  vaultWorkingKey: string;
  vaultRecoveryKey: string;
  storageKey: string;
}

export interface CreatePersistentVaultCoreDependenciesOptions extends VaultCoreDependenciesOptions {
  vaultWorkingKey: string;
}

async function withStorageLock<T>(storage: IStorageProvider, key: string, task: () => Promise<T>): Promise<T> {
  if (storage.withLock) {
    return storage.withLock(key, task);
  }
  return task();
}

function newBase64UrlKey(): string {
  return randomBytes(32).toString("base64url");
}


export async function initializeVaultCustody(
  storage: IStorageProvider,
  options: InitializeVaultCustodyOptions = {},
): Promise<InitializedVaultCustody> {
  const storageKey = options.storageKey ?? DEFAULT_VAULT_KEY_CUSTODY_BLOB_KEY;
  if (!options.overwrite && await storage.has(storageKey)) {
    throw new Error("vault custody already initialized");
  }
  const vaultWorkingKey = options.vaultWorkingKey ?? newBase64UrlKey();
  const vaultRecoveryKey = options.vaultRecoveryKey ?? newBase64UrlKey();
  
  // Ensure the KDK is exactly 32 bytes for sealBlob (AES-256-GCM)
  const kdk = createHash("sha256").update(vaultRecoveryKey).digest("base64url");
  
  const sealed = sealBlob(
    {
      version: "v1.0",
      secrets: {
        vaultWorkingKey,
      },
      secretMetadata: {
        kind: "vault_working_key",
      },
    },
    kdk,
  );
  await storage.write(storageKey, Buffer.from(sealed, "utf8"));
  return {
    vaultWorkingKey,
    vaultRecoveryKey,
    storageKey,
  };
}

export async function recoverVaultWorkingKey(
  storage: IStorageProvider,
  vaultRecoveryKey: string,
  storageKey = DEFAULT_VAULT_KEY_CUSTODY_BLOB_KEY,
): Promise<string> {
  const payload = await storage.read(storageKey);
  if (!payload) {
    throw new Error("vault custody not initialized");
  }

  // Ensure the KDK is exactly 32 bytes for unsealBlob (AES-256-GCM)
  const kdk = createHash("sha256").update(vaultRecoveryKey).digest("base64url");

  const unsealed = unsealBlob(payload.toString("utf8"), kdk);
  const vaultWorkingKey = unsealed.secrets.vaultWorkingKey;
  if (typeof vaultWorkingKey !== "string" || !vaultWorkingKey) {
    throw new Error("vault working key missing from custody blob");
  }
  return vaultWorkingKey;
}

/**
 * @internal
 */
export class FileSecretRepository implements SecretRepository {
  private readonly _repo: SealedJsonRepository<PersistedSecretsState>;

  constructor(
    storage: IStorageProvider,
    vaultWorkingKey: string,
    key = "secrets.sealed",
    private readonly _lockKey = "lock-secrets",
  ) {
    this._repo = new SealedJsonRepository(storage, key, vaultWorkingKey);
  }

  private async loadState(): Promise<PersistedSecretsState> {
    return this._repo.read({ records: [] });
  }

  async save(record: SecretRecord): Promise<void> {
    await withStorageLock(this._repo.storage, this._lockKey, async () => {
      const state = await this.loadState();
      const next = state.records.filter((candidate) => candidate.secretId.value !== record.secretId.value);
      next.push(record);
      await this._repo.write({ records: next }, "secrets_state");
    });
  }

  async delete(secretId: SecretId): Promise<void> {
    await withStorageLock(this._repo.storage, this._lockKey, async () => {
      const state = await this.loadState();
      const next = state.records.filter((candidate) => candidate.secretId.value !== secretId.value);
      await this._repo.write({ records: next }, "secrets_state");
    });
  }

  async getByAlias(alias: SecretAlias): Promise<SecretRecord | null> {
    const state = await this.loadState();
    return state.records.find((record) => record.alias.value === alias.value && !record.retiredAt) ?? null;
  }

  async getById(secretId: SecretId): Promise<SecretRecord | null> {
    const state = await this.loadState();
    return state.records.find((record) => record.secretId.value === secretId.value) ?? null;
  }

  async list(vaultId: VaultId): Promise<readonly SecretRecord[]> {
    const state = await this.loadState();
    return state.records.filter((record) => record.vaultId.value === vaultId.value && !record.retiredAt);
  }
}

/**
 * @internal
 */
export class FileAgentIdentityRegistry implements AgentIdentityRegistry {
  private readonly _repo: SealedJsonRepository<AgentIdentityState>;

  constructor(
    storage: IStorageProvider,
    vaultWorkingKey: string,
    key = "agents.sealed",
    private readonly _lockKey = "lock-agents",
  ) {
    this._repo = new SealedJsonRepository(storage, key, vaultWorkingKey);
  }

  private async loadState(): Promise<AgentIdentityState> {
    return this._repo.read({ identities: [] });
  }

  async register(identity: AgentIdentityRecord): Promise<void> {
    await withStorageLock(this._repo.storage, this._lockKey, async () => {
      const state = await this.loadState();
      const next = state.identities.filter((candidate) =>
        !(candidate.vaultId.value === identity.vaultId.value && candidate.agentId === identity.agentId)
      );
      next.push(identity);
      await this._repo.write({ identities: next }, "agent_identity_state");
    });
  }

  async get(vaultId: VaultId, agentId: string): Promise<AgentIdentityRecord | null> {
    const state = await this.loadState();
    return state.identities.find((identity) => identity.vaultId.value === vaultId.value && identity.agentId === agentId) ?? null;
  }

  async list(vaultId: VaultId): Promise<readonly AgentIdentityRecord[]> {
    const state = await this.loadState();
    return state.identities.filter((identity) => identity.vaultId.value === vaultId.value);
  }
}


/**
 * @internal
 */
export class FileAuditLog implements AuditLog {
  constructor(
    private readonly _storage: IStorageProvider,
    private readonly _key = "audit.jsonl",
    private readonly _lockKey = "lock-audit",
  ) {}

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private verifyEnvelopeChain(lines: string[]): AuditEntry[] {
    const entries: AuditEntry[] = [];
    let previousHash = "GENESIS";
    for (const line of lines) {
      const parsed = JSON.parse(line) as { entry?: AuditEntry; prevHash?: string; hash?: string };
      if (!parsed.entry || typeof parsed.prevHash !== "string" || typeof parsed.hash !== "string") {
        throw new Error("audit chain malformed");
      }
      const payload = JSON.stringify({
        prevHash: parsed.prevHash,
        entry: parsed.entry,
      });
      const expectedHash = this.hash(payload);
      if (parsed.prevHash !== previousHash || parsed.hash !== expectedHash) {
        throw new Error("audit chain verification failed");
      }
      previousHash = parsed.hash;
      entries.push(parsed.entry);
    }
    return entries;
  }

  private async loadEntries(): Promise<AuditEntry[]> {
    const payload = await this._storage.read(this._key);
    if (!payload) {
      return [];
    }
    const lines = payload.toString("utf8").split("\n").filter(Boolean);
    return this.verifyEnvelopeChain(lines);
  }

  async append(entry: AuditEntry): Promise<void> {
    await withStorageLock(this._storage, this._lockKey, async () => {
      const payload = await this._storage.read(this._key);
      const lines = payload ? payload.toString("utf8").split("\n").filter(Boolean) : [];
      this.verifyEnvelopeChain(lines);
      const previousHash = lines.length
        ? (JSON.parse(lines[lines.length - 1]) as { hash: string }).hash
        : "GENESIS";
      const nextEnvelope = {
        prevHash: previousHash,
        entry,
        hash: this.hash(JSON.stringify({ prevHash: previousHash, entry })),
      };
      const contents = [...lines, JSON.stringify(nextEnvelope)].join("\n") + "\n";
      await this._storage.write(this._key, Buffer.from(contents, "utf8"));
    });
  }

  async query(query: AuditQuery): Promise<readonly AuditEntry[]> {
    const entries = await this.loadEntries();
    return entries.filter((entry) => {
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
export class FileSecretCustody implements SecretCustody {
  constructor(
    private readonly _storage: IStorageProvider,
    private readonly _vaultWorkingKey: string,
    private readonly _keyPrefix = "secret",
  ) {}

  private key(secretId: SecretId): string {
    return `${this._keyPrefix}-${secretId.value}.sealed`;
  }

  async store(secretId: SecretId, plaintext: string): Promise<void> {
    await withStorageLock(this._storage, `${this.key(secretId)}:lock`, async () => {
      const sealed = sealBlob(
        {
          version: "v1.0",
          secrets: {
            material: plaintext,
          },
          secretMetadata: {
            secretId: secretId.value,
          },
        },
        this._vaultWorkingKey,
      );
      await this._storage.write(this.key(secretId), Buffer.from(sealed, "utf8"));
    });
  }

  async load(secretId: SecretId): Promise<string | null> {
    const payload = await this._storage.read(this.key(secretId));
    if (!payload) {
      return null;
    }
    const unsealed = unsealBlob(payload.toString("utf8"), this._vaultWorkingKey);
    return unsealed.secrets.material ?? null;
  }

  async delete(secretId: SecretId): Promise<void> {
    await withStorageLock(this._storage, `${this.key(secretId)}:lock`, async () => {
      await this._storage.delete(this.key(secretId));
    });
  }
}

/**
 * @internal
 */
export class FileReplayGuard implements ReplayGuard {
  private readonly _repo: SealedJsonRepository<ReplayState>;

  constructor(
    storage: IStorageProvider,
    vaultWorkingKey: string,
    key = "replay.sealed",
    private readonly _lockKey = "lock-replay",
    private readonly _ttlMs = 5 * 60 * 1000,
  ) {
    this._repo = new SealedJsonRepository(storage, key, vaultWorkingKey);
  }

  async assertNotReplayed(request: DispatchRequest): Promise<void> {
    await withStorageLock(this._repo.storage, this._lockKey, async () => {
      const now = Date.now();
      const state = await this._repo.read({ seen: {} });
      const nextSeen: Record<string, number> = {};
      for (const [key, seenAt] of Object.entries(state.seen)) {
        if (now - seenAt <= this._ttlMs) {
          nextSeen[key] = seenAt;
        }
      }
      const replayKey = `${request.agent.id}:${request.requestId}`;
      if (replayKey in nextSeen) {
        throw new VaultCoreError("request replay detected", "VAULT_DISPATCH_DENIED");
      }
      nextSeen[replayKey] = now;
      await this._repo.write({ seen: nextSeen }, "replay_guard_state");
    });
  }
}

/**
 * @internal
 */
export class FileCapabilityRegistry implements CapabilityStateRegistry {
  private readonly _repo: SealedJsonRepository<CapabilityState>;

  constructor(
    storage: IStorageProvider,
    vaultWorkingKey: string,
    key = "capabilities.sealed",
    private readonly _lockKey = "lock-capabilities",
  ) {
    this._repo = new SealedJsonRepository(storage, key, vaultWorkingKey);
  }

  private async loadState(): Promise<CapabilityState> {
    return this._repo.read({ capabilities: [] });
  }

  async upsert(capability: CapabilityStateRecord): Promise<void> {
    await withStorageLock(this._repo.storage, this._lockKey, async () => {
      const state = await this.loadState();
      const next = state.capabilities.filter((candidate) =>
        !(
          candidate.vaultId.value === capability.vaultId.value
          && candidate.agentId === capability.agentId
          && candidate.capabilityId === capability.capabilityId
        )
      );
      next.push(capability);
      await this._repo.write({ capabilities: next }, "capability_state");
    });
  }

  async getByCapabilityId(vaultId: VaultId, agentId: string, capabilityId: string): Promise<CapabilityStateRecord | null> {
    const state = await this.loadState();
    return state.capabilities.find((capability) =>
      capability.vaultId.value === vaultId.value
      && capability.agentId === agentId
      && capability.capabilityId === capabilityId
    ) ?? null;
  }

  async getByRequestId(vaultId: VaultId, requestId: string): Promise<CapabilityStateRecord | null> {
    const state = await this.loadState();
    return state.capabilities.find((capability) =>
      capability.vaultId.value === vaultId.value
      && capability.requestId === requestId
    ) ?? null;
  }

  async deleteByRequestId(vaultId: VaultId, requestId: string): Promise<void> {
    await withStorageLock(this._repo.storage, this._lockKey, async () => {
      const state = await this.loadState();
      const next = state.capabilities.filter((capability) =>
        !(capability.vaultId.value === vaultId.value && capability.requestId === requestId)
      );
      await this._repo.write({ capabilities: next }, "capability_state");
    });
  }

  async list(vaultId: VaultId, agentId?: string): Promise<readonly CapabilityStateRecord[]> {
    const state = await this.loadState();
    return state.capabilities.filter((capability) => {
      if (capability.vaultId.value !== vaultId.value) return false;
      if (agentId && capability.agentId !== agentId) return false;
      return true;
    });
  }
}

/**
 * @internal
 */
export class FileRateLimitStore implements RateLimitStore {
  private readonly _repo: SealedJsonRepository<RateLimitState>;

  constructor(
    storage: IStorageProvider,
    vaultWorkingKey: string,
    key = "rate-limits.sealed",
    private readonly _lockKey = "lock-rate-limits",
  ) {
    this._repo = new SealedJsonRepository(storage, key, vaultWorkingKey);
  }

  async consume(key: string, maxRequests: number, windowMs: number, nowMs: number): Promise<void> {
    await withStorageLock(this._repo.storage, this._lockKey, async () => {
      const state = await this._repo.read({ buckets: {} });
      const nextBuckets: Record<string, { count: number; resetAt: number }> = {};
      for (const [bucketKey, bucket] of Object.entries(state.buckets)) {
        if (nowMs < bucket.resetAt) {
          nextBuckets[bucketKey] = bucket;
        }
      }
      const current = nextBuckets[key];
      if (!current || nowMs >= current.resetAt) {
        nextBuckets[key] = {
          count: 1,
          resetAt: nowMs + windowMs,
        };
      } else {
        if (current.count >= maxRequests) {
          throw new VaultCoreError("capability rate limit exceeded", "VAULT_DISPATCH_DENIED");
        }
        current.count += 1;
      }
      await this._repo.write({ buckets: nextBuckets }, "rate_limit_state");
    });
  }
}

/**
 * @internal
 */
export class FileCapabilityRevocationRegistry implements CapabilityRevocationRegistry {
  private readonly _repo: SealedJsonRepository<RevocationState>;

  constructor(
    storage: IStorageProvider,
    vaultWorkingKey: string,
    key = "revocations.sealed",
    private readonly _lockKey = "lock-revocations",
  ) {
    this._repo = new SealedJsonRepository(storage, key, vaultWorkingKey);
  }

  private compositeKey(vaultId: VaultId, agentId: string, capabilityId: string): string {
    return `${vaultId.value}:${agentId}:${capabilityId}`;
  }

  async get(vaultId: VaultId, agentId: string, capabilityId: string): Promise<number> {
    const state = await this._repo.read({ versions: {} });
    return state.versions[this.compositeKey(vaultId, agentId, capabilityId)] ?? 0;
  }

  async revoke(vaultId: VaultId, agentId: string, capabilityId: string): Promise<number> {
    return withStorageLock(this._repo.storage, this._lockKey, async () => {
      const state = await this._repo.read({ versions: {} });
      const key = this.compositeKey(vaultId, agentId, capabilityId);
      const next = (state.versions[key] ?? 0) + 1;
      state.versions[key] = next;
      await this._repo.write(state, "revocation_state");
      return next;
    });
  }
}

/**
 * @internal
 */
export class FileCustomHttpFlowRegistry implements CustomHttpFlowRegistry {
  private readonly _repo: SealedJsonRepository<CustomFlowState>;

  constructor(
    storage: IStorageProvider,
    vaultWorkingKey: string,
    key = "custom-flows.sealed",
    private readonly _lockKey = "lock-custom-flows",
  ) {
    this._repo = new SealedJsonRepository(storage, key, vaultWorkingKey);
  }

  private async loadState(): Promise<CustomFlowState> {
    return this._repo.read({ flows: [] });
  }

  async register(flow: CustomHttpFlowDefinition): Promise<void> {
    await withStorageLock(this._repo.storage, this._lockKey, async () => {
      const state = await this.loadState();
      const next = state.flows.filter((candidate) => candidate.flowId !== flow.flowId);
      next.push(flow);
      await this._repo.write({ flows: next }, "custom_flow_state");
    });
  }

  async get(vaultId: VaultId, flowId: string): Promise<CustomHttpFlowDefinition | null> {
    const state = await this.loadState();
    return state.flows.find((flow) => flow.vaultId.value === vaultId.value && flow.flowId === flowId) ?? null;
  }
}

export function createPersistentVaultCoreDependencies(
  storage: IStorageProvider,
  options: CreatePersistentVaultCoreDependenciesOptions,
): VaultCoreDependencies {
  const defaults = createVaultCoreDependencies(options);
  const agentIdentities = new FileAgentIdentityRegistry(storage, options.vaultWorkingKey);
  const sessionTokens = new InMemorySessionTokenRegistry(); // Session tokens are in-memory for now
  const capabilityRevocations = new FileCapabilityRevocationRegistry(storage, options.vaultWorkingKey);
  const capabilities = new FileCapabilityRegistry(storage, options.vaultWorkingKey);
  const customFlows = new FileCustomHttpFlowRegistry(storage, options.vaultWorkingKey);

  return {
    vaultId: defaults.vaultId,
    secrets: new FileSecretRepository(storage, options.vaultWorkingKey),
    custody: new FileSecretCustody(storage, options.vaultWorkingKey),
    audit: new FileAuditLog(storage),
    agentIdentities,
    policy: new DefaultPolicyEngine({
      ...(options.policy ?? {}),
      capabilityRevocationRegistry: capabilityRevocations,
      rateLimitStore: new FileRateLimitStore(storage, options.vaultWorkingKey),
    }),
    replayGuard: new FileReplayGuard(
      storage,
      options.vaultWorkingKey,
      "replay.sealed",
      "lock-replay",
      options.proofVerifier?.maxSkewMs ?? (5 * 60 * 1000),
    ),
    agentProofVerifier: new SignatureAgentProofVerifier(agentIdentities, sessionTokens, options.proofVerifier),
    capabilityStates: capabilities,
    customFlows,
    sessionTokens,
    clock: defaults.clock,
    ids: defaults.ids,
    executor: defaults.executor,
    capabilityRevocations, // Added for parity with legacy behavior/testing
  } as VaultCoreDependencies & { capabilityRevocations: CapabilityRevocationRegistry };
}
