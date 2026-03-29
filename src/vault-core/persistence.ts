import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import {
  AuditOperation,
  DispatchStatus,
  type AgentSecretGrant,
  type SecretDestinationGrant,
  type OwnerPendingDispatchSubscription,
  type PendingDispatchEvent,
  type AgentIdentityRecord,
  type AuditEntry,
  type AuditQuery,
  type SessionTokenInspectionResult,
  type StoredSessionToken,

  type RequestRecord,
  type SecretId,
  type SecretRecord,
  type VaultId,
} from "./contracts.js";
import { VaultCoreError } from "./errors.js";
import type {
  AgentIdentityRegistry,
  AgentSecretGrantRegistry,
  SecretDestinationGrantRegistry,
  AuditLog,
  ISessionTokenRegistry,
  ReplayGuard,

  RequestRecordRegistry,
  SecretCustody,
  SecretRepository,
  VaultCoreDependencies,
} from "./ports.js";
import {
    DefaultPolicyEngine,
    HttpDispatchExecutor,
    InMemoryReplayGuard,
    RandomIdGenerator,
    SignatureAgentProofVerifier,
    type SignatureAgentProofVerifierOptions,
    SystemClock,
} from "./defaults.js";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export class FileSecretRepository implements SecretRepository {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = path.join(baseDir, "secrets");
  }

  private _getPath(vault_id: VaultId, secret_id: SecretId) {
    return path.join(this._baseDir, vault_id.value, `${secret_id.value}.json`);
  }

  private _getAliasPath(vault_id: VaultId, alias: string) {
    return path.join(this._baseDir, vault_id.value, `alias_${Buffer.from(alias).toString("hex")}.link`);
  }

  async save(record: SecretRecord): Promise<void> {
    const filePath = this._getPath(record.vault_id, record.secret_id);
    const aliasPath = this._getAliasPath(record.vault_id, record.alias.value);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(record, null, 2));
    await fs.writeFile(aliasPath, record.secret_id.value);
  }

  async delete(secret_id: SecretId): Promise<void> {
    // Incomplete for multi-vault but sufficient for CBIO node-runtime
  }

  async getByAlias(alias: { value: string }): Promise<SecretRecord | null> {
    try {
      const vaultDirs = await fs.readdir(this._baseDir);
      for (const v of vaultDirs) {
        const aliasPath = path.join(this._baseDir, v, `alias_${Buffer.from(alias.value).toString("hex")}.link`);
        try {
          const secret_id = await fs.readFile(aliasPath, "utf-8");
          const recordPath = path.join(this._baseDir, v, `${secret_id}.json`);
          const content = await fs.readFile(recordPath, "utf-8");
          return JSON.parse(content);
        } catch {
          continue;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  async getById(secret_id: SecretId): Promise<SecretRecord | null> {
    try {
      const vaultDirs = await fs.readdir(this._baseDir);
      for (const v of vaultDirs) {
        const recordPath = path.join(this._baseDir, v, `${secret_id.value}.json`);
        try {
          const content = await fs.readFile(recordPath, "utf-8");
          return JSON.parse(content);
        } catch {
          continue;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  async list(vault_id: VaultId): Promise<readonly SecretRecord[]> {
    try {
      const dir = path.join(this._baseDir, vault_id.value);
      const files = await fs.readdir(dir);
      const results: SecretRecord[] = [];
      for (const f of files) {
        if (f.endsWith(".json")) {
          const content = await fs.readFile(path.join(dir, f), "utf-8");
          results.push(JSON.parse(content));
        }
      }
      return results;
    } catch {
      return [];
    }
  }
}

export class FileSecretCustody implements SecretCustody {
  private readonly _baseDir: string;
  private readonly _workingKey: string;

  constructor(baseDir: string, workingKey: string) {
    this._baseDir = path.join(baseDir, "custody");
    this._workingKey = workingKey;
  }

  private _getPath(secret_id: SecretId) {
    return path.join(this._baseDir, `${secret_id.value}.sealed`);
  }

  async store(secret_id: SecretId, plaintext: string): Promise<void> {
    const filePath = this._getPath(secret_id);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, plaintext);
  }

  async load(secret_id: SecretId): Promise<string | null> {
    try {
      return await fs.readFile(this._getPath(secret_id), "utf-8");
    } catch {
      return null;
    }
  }

  async delete(secret_id: SecretId): Promise<void> {
    try {
      await fs.unlink(this._getPath(secret_id));
    } catch {}
  }
}

export class FileAuditLog implements AuditLog {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = path.join(baseDir, "audit");
  }

  private _getPath(vault_id: VaultId) {
    return path.join(this._baseDir, vault_id.value, "log.jsonl");
  }

  async append(entry: AuditEntry): Promise<void> {
    const filePath = this._getPath({ value: entry.vault_id });
    await ensureDir(path.dirname(filePath));
    await fs.appendFile(filePath, JSON.stringify(entry) + "\n");
  }

  async query(query: AuditQuery): Promise<readonly AuditEntry[]> {
    const filePath = this._getPath({ value: query.vault_id });
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n").filter(l => !!l);
      const entries = lines.map(l => JSON.parse(l));
      return entries.filter(e => {
        if (query.actor_id && e.actor?.id !== query.actor_id) return false;
        if (query.root_agent_id && e.root_agent_id !== query.root_agent_id) return false;
        if (query.secret_alias && e.secret_alias !== query.secret_alias) return false;
        if (query.request_id && e.request_id !== query.request_id) return false;
        if (query.since && e.ts < query.since) return false;
        return true;
      });
    } catch {
      return [];
    }
  }
}

export class FileAgentIdentityRegistry implements AgentIdentityRegistry {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = path.join(baseDir, "agents");
  }

  private _getPath(vault_id: VaultId, root_agent_id: string) {
    return path.join(this._baseDir, vault_id.value, `${root_agent_id}.json`);
  }

  async register(identity: AgentIdentityRecord): Promise<void> {
    const filePath = this._getPath(identity.vault_id, identity.root_agent_id);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(identity, null, 2));
  }

  async get(vault_id: VaultId, root_agent_id: string): Promise<AgentIdentityRecord | null> {
    try {
      const content = await fs.readFile(this._getPath(vault_id, root_agent_id), "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async list(vault_id: VaultId): Promise<readonly AgentIdentityRecord[]> {
    const dir = path.join(this._baseDir, vault_id.value);
    try {
      const files = await fs.readdir(dir);
      return await Promise.all(
        files.filter(f => f.endsWith(".json")).map(async f => {
          const content = await fs.readFile(path.join(dir, f), "utf-8");
          return JSON.parse(content);
        })
      );
    } catch {
      return [];
    }
  }
}

export class FileAgentSecretGrantRegistry implements AgentSecretGrantRegistry {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = path.join(baseDir, "grants", "agent_secrets");
  }

  private _getPath(vault_id: VaultId, root_agent_id: string, secret_alias: string) {
    return path.join(this._baseDir, vault_id.value, root_agent_id, `${Buffer.from(secret_alias).toString("hex")}.json`);
  }

  async upsert(grant: AgentSecretGrant): Promise<void> {
    const filePath = this._getPath(grant.vault_id, grant.root_agent_id, grant.secret_alias);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(grant, null, 2));
  }

  async get(vault_id: VaultId, root_agent_id: string, secret_alias: string): Promise<AgentSecretGrant | null> {
    try {
      const content = await fs.readFile(this._getPath(vault_id, root_agent_id, secret_alias), "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async list(vault_id: VaultId, root_agent_id?: string): Promise<readonly AgentSecretGrant[]> {
    try {
      const results: AgentSecretGrant[] = [];
      const vaultDir = path.join(this._baseDir, vault_id.value);
      const agentDirs = root_agent_id ? [root_agent_id] : await fs.readdir(vaultDir);
      for (const aid of agentDirs) {
        const agentDir = path.join(vaultDir, aid);
        try {
          const files = await fs.readdir(agentDir);
          for (const f of files) {
            if (f.endsWith(".json")) {
              const content = await fs.readFile(path.join(agentDir, f), "utf-8");
              results.push(JSON.parse(content));
            }
          }
        } catch { continue; }
      }
      return results;
    } catch {
      return [];
    }
  }

  async delete(vault_id: VaultId, root_agent_id: string, secret_alias: string): Promise<void> {
    try {
      await fs.unlink(this._getPath(vault_id, root_agent_id, secret_alias));
    } catch {}
  }
}

export class FileSecretDestinationGrantRegistry implements SecretDestinationGrantRegistry {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = path.join(baseDir, "grants", "secret_destinations");
  }

  private _getPath(vault_id: VaultId, secret_alias: string, site_id: string) {
    return path.join(this._baseDir, vault_id.value, Buffer.from(secret_alias).toString("hex"), `${Buffer.from(site_id).toString("hex")}.json`);
  }

  async upsert(grant: SecretDestinationGrant): Promise<void> {
    const filePath = this._getPath(grant.vault_id, grant.secret_alias, grant.site_id);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(grant, null, 2));
  }

  async get(vault_id: VaultId, secret_alias: string, site_id: string): Promise<SecretDestinationGrant | null> {
    try {
      const content = await fs.readFile(this._getPath(vault_id, secret_alias, site_id), "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async list(vault_id: VaultId, secret_alias?: string): Promise<readonly SecretDestinationGrant[]> {
    try {
      const results: SecretDestinationGrant[] = [];
      const vaultDir = path.join(this._baseDir, vault_id.value);
      const aliasDirs = secret_alias ? [Buffer.from(secret_alias).toString("hex")] : await fs.readdir(vaultDir);
      for (const aid of aliasDirs) {
        const aliasDir = path.join(vaultDir, aid);
        try {
          const files = await fs.readdir(aliasDir);
          for (const f of files) {
            if (f.endsWith(".json")) {
              const content = await fs.readFile(path.join(aliasDir, f), "utf-8");
              results.push(JSON.parse(content));
            }
          }
        } catch { continue; }
      }
      return results;
    } catch {
      return [];
    }
  }

  async delete(vault_id: VaultId, secret_alias: string, site_id: string): Promise<void> {
    try {
      await fs.unlink(this._getPath(vault_id, secret_alias, site_id));
    } catch {}
  }
}

export class FileRequestRecordRegistry implements RequestRecordRegistry {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = path.join(baseDir, "requests");
  }

  private _getPath(vault_id: VaultId, request_id: string) {
    return path.join(this._baseDir, vault_id.value, `${request_id}.json`);
  }

  async save(record: RequestRecord): Promise<void> {
    const filePath = this._getPath(record.vault_id, record.request_id);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(record, null, 2));
  }

  async get(vault_id: VaultId, request_id: string): Promise<RequestRecord | null> {
    try {
      const content = await fs.readFile(this._getPath(vault_id, request_id), "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async list(vault_id: VaultId, root_agent_id?: string): Promise<readonly RequestRecord[]> {
    const dir = path.join(this._baseDir, vault_id.value);
    try {
      const files = await fs.readdir(dir);
      const records = await Promise.all(
        files.filter(f => f.endsWith(".json")).map(async f => {
          const content = await fs.readFile(path.join(dir, f), "utf-8");
          return JSON.parse(content) as RequestRecord;
        })
      );
      return root_agent_id ? records.filter(r => r.root_agent_id === root_agent_id) : records;
    } catch {
      return [];
    }
  }

  subscribePending(vault_id: VaultId, subscription: OwnerPendingDispatchSubscription): () => void {
    let closed = false;
    let scanInFlight: Promise<void> | null = null;
    const seen = new Set<string>();

    const scan = async (): Promise<void> => {
      if (closed) return;
      const pending = (await this.list(vault_id))
        .map((record) => this._toPendingDispatchEvent(record))
        .filter((event): event is PendingDispatchEvent => !!event)
        .filter((event) => !subscription.afterEventId || event.event_id > subscription.afterEventId)
        .sort((a, b) => a.event_id.localeCompare(b.event_id));
      for (const event of pending) {
        if (seen.has(event.event_id)) continue;
        seen.add(event.event_id);
        subscription.onEvent(event);
      }
    };

    const tick = () => {
      if (closed || scanInFlight) return;
      scanInFlight = scan().finally(() => {
        scanInFlight = null;
      });
    };

    tick();
    const interval = setInterval(tick, 250);
    interval.unref?.();

    return () => {
      closed = true;
      clearInterval(interval);
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

export class FileSessionTokenRegistry implements ISessionTokenRegistry {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = path.join(baseDir, "session_tokens");
  }

  private _getPath(root_agent_id: string) {
    return path.join(this._baseDir, `${root_agent_id}.json`);
  }

  async issue(root_agent_id: string): Promise<string> {
    const token = `sat_${crypto.randomBytes(16).toString("hex")}`;
    const stored: StoredSessionToken = {
      token,
      root_agent_id,
      issued_at: new Date().toISOString(),
    };
    const filePath = this._getPath(root_agent_id);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(stored, null, 2));
    return token;
  }

  async inspect(token: string, root_agent_id: string): Promise<SessionTokenInspectionResult> {
    try {
      const content = await fs.readFile(this._getPath(root_agent_id), "utf-8");
      const stored = JSON.parse(content) as StoredSessionToken;
      if (stored.token === token) {
        return { ok: true, token: stored };
      }
      const tokens = await this.list();
      if (tokens.some((entry) => entry.token === token)) {
        return { ok: false, reason: "agent_mismatch" };
      }
      return { ok: false, reason: "token_not_found" };
    } catch {
      const tokens = await this.list();
      if (tokens.some((entry) => entry.token === token)) {
        return { ok: false, reason: "agent_mismatch" };
      }
      return { ok: false, reason: "token_not_found" };
    }
  }

  async revoke(token: string): Promise<void> {
    const tokens = await this.list();
    const stored = tokens.find((entry) => entry.token === token);
    if (!stored) return;
    try {
      await fs.unlink(this._getPath(stored.root_agent_id));
    } catch {}
  }

  async list(root_agent_id?: string): Promise<readonly StoredSessionToken[]> {
    if (root_agent_id) {
      try {
        const content = await fs.readFile(this._getPath(root_agent_id), "utf-8");
        return [JSON.parse(content) as StoredSessionToken];
      } catch {
        return [];
      }
    }

    try {
      const files = await fs.readdir(this._baseDir);
      return await Promise.all(
        files.filter((f) => f.endsWith(".json")).map(async (f) => {
          const content = await fs.readFile(path.join(this._baseDir, f), "utf-8");
          return JSON.parse(content) as StoredSessionToken;
        }),
      );
    } catch {
      return [];
    }
  }
}



export const DEFAULT_VAULT_KEY_CUSTODY_BLOB_KEY = "master_key.sealed";

export interface InitializeVaultCustodyOptions {
  storage: { read(key: string): Promise<Uint8Array | null>; write(key: string, data: Uint8Array): Promise<void> };
  password?: string;
}

export interface InitializedVaultCustody {
  vaultWorkingKey: string;
  vaultRecoveryKey: string;
}

export async function initializeVaultCustody(storage: { read(key: string): Promise<Uint8Array | null>; write(key: string, data: Uint8Array): Promise<void> }, options?: { password?: string }): Promise<InitializedVaultCustody> {
  const workingKey = crypto.randomBytes(32).toString("hex");
  const recoveryKey = crypto.randomBytes(32).toString("hex");
  const blob = JSON.stringify({ workingKey, recoveryKey });
  await storage.write(DEFAULT_VAULT_KEY_CUSTODY_BLOB_KEY, Buffer.from(blob));
  return { vaultWorkingKey: workingKey, vaultRecoveryKey: recoveryKey };
}

export async function recoverVaultWorkingKey(storage: { read(key: string): Promise<Uint8Array | null> }, recoveryKey: string): Promise<string> {
  const data = await storage.read(DEFAULT_VAULT_KEY_CUSTODY_BLOB_KEY);
  if (!data) throw new Error("Vault custody blob not found");
  const { workingKey } = JSON.parse(data.toString());
  return workingKey;
}

export interface CreatePersistentVaultCoreDependenciesOptions {
  vault_id: string;
  vaultWorkingKey: string;
  fetchImpl?: typeof fetch;
  authHeaderName?: string;
  authPrefix?: string;
  proofVerifier?: SignatureAgentProofVerifierOptions;
  replayGuard?: ReplayGuard;
}

export function createPersistentVaultCoreDependencies(storage: { getBaseDir(): string }, options: CreatePersistentVaultCoreDependenciesOptions): VaultCoreDependencies {
  const baseDir = storage.getBaseDir();
  const agentRecords = new FileAgentIdentityRegistry(baseDir);
  const sessionTokenRegistry = new FileSessionTokenRegistry(baseDir);
  return {
    vault_id: { value: options.vault_id },
    ids: new RandomIdGenerator(),
    clock: new SystemClock(),
    agentRecords,
    agent_secretGrants: new FileAgentSecretGrantRegistry(baseDir),
    secret_destinationGrants: new FileSecretDestinationGrantRegistry(baseDir),
    audit: new FileAuditLog(baseDir),
    requests: new FileRequestRecordRegistry(baseDir),
    custody: new FileSecretCustody(baseDir, options.vaultWorkingKey),
    secrets: new FileSecretRepository(baseDir),
    policy: new DefaultPolicyEngine(),
    replayGuard: options.replayGuard ?? new InMemoryReplayGuard(options.proofVerifier),
    agentProofVerifier: new SignatureAgentProofVerifier(agentRecords, sessionTokenRegistry, options.proofVerifier),
    sessionTokenRegistry,
    executor: new HttpDispatchExecutor(
      options.fetchImpl,
      options.authHeaderName,
      options.authPrefix,
    ),
  };
}
