import type { IStorageProvider } from "../storage/provider.js";
import { sealBlob, unsealBlob } from "../sealed/seal.js";
import type {
  AuditEntry,
  AuditQuery,
  VaultId,
  CustomHttpFlowDefinition,
  SecretAlias,
  SecretId,
  SecretRecord,
} from "./contracts.js";
import type {
  AuditLog,
  CapabilityRevocationRegistry,
  CustomHttpFlowRegistry,
  RateLimitStore,
  ReplayGuard,
  SecretCustody,
  SecretRepository,
} from "./ports.js";
import {
  DefaultPolicyEngine,
  createDefaultVaultCoreDependencies,
  type CreateDefaultVaultCoreDependenciesOptions,
} from "./defaults.js";
import { createHash } from "node:crypto";
import { VaultCoreError } from "./errors.js";
import type { DispatchRequest } from "./contracts.js";

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

function serializeJson(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value, null, 2), "utf8");
}

async function readJson<T>(storage: IStorageProvider, key: string, fallback: T): Promise<T> {
  const payload = await storage.read(key);
  if (!payload) {
    return fallback;
  }
  return JSON.parse(payload.toString("utf8")) as T;
}

async function withStorageLock<T>(storage: IStorageProvider, key: string, task: () => Promise<T>): Promise<T> {
  if (storage.withLock) {
    return storage.withLock(key, task);
  }
  return task();
}

export class FileSecretRepository implements SecretRepository {
  constructor(
    private readonly _storage: IStorageProvider,
    private readonly _key = "vault/secrets.json",
    private readonly _lockKey = "vault/locks/secrets",
  ) {}

  private async loadState(): Promise<PersistedSecretsState> {
    return readJson(this._storage, this._key, { records: [] });
  }

  async save(record: SecretRecord): Promise<void> {
    await withStorageLock(this._storage, this._lockKey, async () => {
      const state = await this.loadState();
      const next = state.records.filter((candidate) => candidate.secretId.value !== record.secretId.value);
      next.push(record);
      await this._storage.write(this._key, serializeJson({ records: next }));
    });
  }

  async delete(secretId: SecretId): Promise<void> {
    await withStorageLock(this._storage, this._lockKey, async () => {
      const state = await this.loadState();
      const next = state.records.filter((candidate) => candidate.secretId.value !== secretId.value);
      await this._storage.write(this._key, serializeJson({ records: next }));
    });
  }

  async getByAlias(alias: SecretAlias): Promise<SecretRecord | null> {
    const state = await this.loadState();
    return state.records.find((record) => record.alias.value === alias.value) ?? null;
  }

  async getById(secretId: SecretId): Promise<SecretRecord | null> {
    const state = await this.loadState();
    return state.records.find((record) => record.secretId.value === secretId.value) ?? null;
  }
}

export class FileAuditLog implements AuditLog {
  constructor(
    private readonly _storage: IStorageProvider,
    private readonly _key = "vault/audit.jsonl",
    private readonly _lockKey = "vault/locks/audit",
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

export class FileSecretCustody implements SecretCustody {
  constructor(
    private readonly _storage: IStorageProvider,
    private readonly _custodyKey: string,
    private readonly _keyPrefix = "vault/custody",
  ) {}

  private key(secretId: SecretId): string {
    return `${this._keyPrefix}/${secretId.value}.sealed`;
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
        this._custodyKey,
      );
      await this._storage.write(this.key(secretId), Buffer.from(sealed, "utf8"));
    });
  }

  async load(secretId: SecretId): Promise<string | null> {
    const payload = await this._storage.read(this.key(secretId));
    if (!payload) {
      return null;
    }
    const unsealed = unsealBlob(payload.toString("utf8"), this._custodyKey);
    return unsealed.secrets.material ?? null;
  }

  async delete(secretId: SecretId): Promise<void> {
    await withStorageLock(this._storage, `${this.key(secretId)}:lock`, async () => {
      await this._storage.delete(this.key(secretId));
    });
  }
}

export class FileReplayGuard implements ReplayGuard {
  constructor(
    private readonly _storage: IStorageProvider,
    private readonly _key = "vault/security/replay.json",
    private readonly _lockKey = "vault/locks/replay",
    private readonly _ttlMs = 5 * 60 * 1000,
  ) {}

  async assertNotReplayed(request: DispatchRequest): Promise<void> {
    await withStorageLock(this._storage, this._lockKey, async () => {
      const now = Date.now();
      const state = await readJson<ReplayState>(this._storage, this._key, { seen: {} });
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
      await this._storage.write(this._key, serializeJson({ seen: nextSeen }));
    });
  }
}

export class FileRateLimitStore implements RateLimitStore {
  constructor(
    private readonly _storage: IStorageProvider,
    private readonly _key = "vault/security/rate-limits.json",
    private readonly _lockKey = "vault/locks/rate-limits",
  ) {}

  async consume(key: string, maxRequests: number, windowMs: number, nowMs: number): Promise<void> {
    await withStorageLock(this._storage, this._lockKey, async () => {
      const state = await readJson<RateLimitState>(this._storage, this._key, { buckets: {} });
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
      await this._storage.write(this._key, serializeJson({ buckets: nextBuckets }));
    });
  }
}

export class FileCapabilityRevocationRegistry implements CapabilityRevocationRegistry {
  constructor(
    private readonly _storage: IStorageProvider,
    private readonly _key = "vault/security/revocations.json",
    private readonly _lockKey = "vault/locks/revocations",
  ) {}

  private compositeKey(vaultId: VaultId, agentId: string, capabilityId: string): string {
    return `${vaultId.value}:${agentId}:${capabilityId}`;
  }

  async get(vaultId: VaultId, agentId: string, capabilityId: string): Promise<number> {
    const state = await readJson<RevocationState>(this._storage, this._key, { versions: {} });
    return state.versions[this.compositeKey(vaultId, agentId, capabilityId)] ?? 0;
  }

  async revoke(vaultId: VaultId, agentId: string, capabilityId: string): Promise<number> {
    return withStorageLock(this._storage, this._lockKey, async () => {
      const state = await readJson<RevocationState>(this._storage, this._key, { versions: {} });
      const key = this.compositeKey(vaultId, agentId, capabilityId);
      const next = (state.versions[key] ?? 0) + 1;
      state.versions[key] = next;
      await this._storage.write(this._key, serializeJson(state));
      return next;
    });
  }
}

export class FileCustomHttpFlowRegistry implements CustomHttpFlowRegistry {
  constructor(
    private readonly _storage: IStorageProvider,
    private readonly _key = "vault/custom-flows.json",
    private readonly _lockKey = "vault/locks/custom-flows",
  ) {}

  private async loadState(): Promise<CustomFlowState> {
    return readJson(this._storage, this._key, { flows: [] });
  }

  async register(flow: CustomHttpFlowDefinition): Promise<void> {
    await withStorageLock(this._storage, this._lockKey, async () => {
      const state = await this.loadState();
      const next = state.flows.filter((candidate) => candidate.flowId !== flow.flowId);
      next.push(flow);
      await this._storage.write(this._key, serializeJson({ flows: next }));
    });
  }

  async get(vaultId: VaultId, flowId: string): Promise<CustomHttpFlowDefinition | null> {
    const state = await this.loadState();
    return state.flows.find((flow) => flow.vaultId.value === vaultId.value && flow.flowId === flowId) ?? null;
  }
}

export function createPersistentVaultCoreDependencies(
  storage: IStorageProvider,
  options: CreateDefaultVaultCoreDependenciesOptions = {},
): {
  vaultId: ReturnType<typeof createDefaultVaultCoreDependencies>["vaultId"];
  secrets: FileSecretRepository;
  custody: FileSecretCustody;
  policy: ReturnType<typeof createDefaultVaultCoreDependencies>["policy"];
  audit: FileAuditLog;
  executor: ReturnType<typeof createDefaultVaultCoreDependencies>["executor"];
  agentIdentities: ReturnType<typeof createDefaultVaultCoreDependencies>["agentIdentities"];
  ownerIdentities: ReturnType<typeof createDefaultVaultCoreDependencies>["ownerIdentities"];
  proofVerifier: ReturnType<typeof createDefaultVaultCoreDependencies>["proofVerifier"];
  ownerProofVerifier: ReturnType<typeof createDefaultVaultCoreDependencies>["ownerProofVerifier"];
  replayGuard: ReplayGuard;
  capabilityRevocations: CapabilityRevocationRegistry;
  customFlows: CustomHttpFlowRegistry;
  clock: ReturnType<typeof createDefaultVaultCoreDependencies>["clock"];
  ids: ReturnType<typeof createDefaultVaultCoreDependencies>["ids"];
} {
  if (!options.custodyKey) {
    throw new Error("persistent vault dependencies require custodyKey");
  }
  const defaults = createDefaultVaultCoreDependencies(options);
  const capabilityRevocations = new FileCapabilityRevocationRegistry(storage);
  const customFlows = new FileCustomHttpFlowRegistry(storage);
  return {
    ...defaults,
    secrets: new FileSecretRepository(storage),
    custody: new FileSecretCustody(storage, options.custodyKey),
    audit: new FileAuditLog(storage),
    policy: new DefaultPolicyEngine({
      ...(options.policy ?? {}),
      capabilityRevocationRegistry: capabilityRevocations,
      rateLimitStore: new FileRateLimitStore(storage),
    }),
    replayGuard: new FileReplayGuard(
      storage,
      "vault/security/replay.json",
      "vault/locks/replay",
      options.proofVerifier?.maxSkewMs ?? (5 * 60 * 1000),
    ),
    capabilityRevocations,
    customFlows,
  };
}
