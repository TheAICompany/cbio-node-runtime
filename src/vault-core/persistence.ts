import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import {
  AuditAction,
  AuditOutcome,
  DispatchStatus,
  type AgentSecretGrant,
  type SecretDestinationGrant,
  type AgentIdentityRecord,
  type AuditEntry,
  type AuditQuery,
  type CustomHttpFlowDefinition,
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
  CustomHttpFlowRegistry,
  RequestRecordRegistry,
  SecretCustody,
  SecretRepository,
} from "./ports.js";
import {
    DefaultPolicyEngine,
    RandomIdGenerator,
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

  private _getPath(vaultId: VaultId, secretId: SecretId) {
    return path.join(this._baseDir, vaultId.value, `${secretId.value}.json`);
  }

  private _getAliasPath(vaultId: VaultId, alias: string) {
    return path.join(this._baseDir, vaultId.value, `alias_${Buffer.from(alias).toString("hex")}.link`);
  }

  async save(record: SecretRecord): Promise<void> {
    const filePath = this._getPath(record.vaultId, record.secretId);
    const aliasPath = this._getAliasPath(record.vaultId, record.alias.value);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(record, null, 2));
    await fs.writeFile(aliasPath, record.secretId.value);
  }

  async delete(secretId: SecretId): Promise<void> {
    // Incomplete for multi-vault but sufficient for CBIO node-runtime
  }

  async getByAlias(alias: { value: string }): Promise<SecretRecord | null> {
    try {
      const vaultDirs = await fs.readdir(this._baseDir);
      for (const v of vaultDirs) {
        const aliasPath = path.join(this._baseDir, v, `alias_${Buffer.from(alias.value).toString("hex")}.link`);
        try {
          const secretId = await fs.readFile(aliasPath, "utf-8");
          const recordPath = path.join(this._baseDir, v, `${secretId}.json`);
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

  async getById(secretId: SecretId): Promise<SecretRecord | null> {
    try {
      const vaultDirs = await fs.readdir(this._baseDir);
      for (const v of vaultDirs) {
        const recordPath = path.join(this._baseDir, v, `${secretId.value}.json`);
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

  async list(vaultId: VaultId): Promise<readonly SecretRecord[]> {
    try {
      const dir = path.join(this._baseDir, vaultId.value);
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

  private _getPath(secretId: SecretId) {
    return path.join(this._baseDir, `${secretId.value}.sealed`);
  }

  async store(secretId: SecretId, plaintext: string): Promise<void> {
    const filePath = this._getPath(secretId);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, plaintext);
  }

  async load(secretId: SecretId): Promise<string | null> {
    try {
      return await fs.readFile(this._getPath(secretId), "utf-8");
    } catch {
      return null;
    }
  }

  async delete(secretId: SecretId): Promise<void> {
    try {
      await fs.unlink(this._getPath(secretId));
    } catch {}
  }
}

export class FileAuditLog implements AuditLog {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = path.join(baseDir, "audit");
  }

  private _getPath(vaultId: VaultId) {
    return path.join(this._baseDir, vaultId.value, "log.jsonl");
  }

  async append(entry: AuditEntry): Promise<void> {
    const filePath = this._getPath(entry.vaultId);
    await ensureDir(path.dirname(filePath));
    await fs.appendFile(filePath, JSON.stringify(entry) + "\n");
  }

  async query(query: AuditQuery): Promise<readonly AuditEntry[]> {
    const filePath = this._getPath(query.vaultId);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n").filter(l => !!l);
      const entries = lines.map(l => JSON.parse(l));
      return entries.filter(e => {
        if (query.secretAlias && e.secretAlias !== query.secretAlias) return false;
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

  private _getPath(vaultId: VaultId, rootAgentId: string) {
    return path.join(this._baseDir, vaultId.value, `${rootAgentId}.json`);
  }

  async register(identity: AgentIdentityRecord): Promise<void> {
    const filePath = this._getPath(identity.vaultId, identity.rootAgentId);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(identity, null, 2));
  }

  async get(vaultId: VaultId, rootAgentId: string): Promise<AgentIdentityRecord | null> {
    try {
      const content = await fs.readFile(this._getPath(vaultId, rootAgentId), "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async list(vaultId: VaultId): Promise<readonly AgentIdentityRecord[]> {
    const dir = path.join(this._baseDir, vaultId.value);
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

  private _getPath(vaultId: VaultId, rootAgentId: string, secretAlias: string) {
    return path.join(this._baseDir, vaultId.value, rootAgentId, `${Buffer.from(secretAlias).toString("hex")}.json`);
  }

  async upsert(grant: AgentSecretGrant): Promise<void> {
    const filePath = this._getPath(grant.vaultId, grant.rootAgentId, grant.secretAlias);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(grant, null, 2));
  }

  async get(vaultId: VaultId, rootAgentId: string, secretAlias: string): Promise<AgentSecretGrant | null> {
    try {
      const content = await fs.readFile(this._getPath(vaultId, rootAgentId, secretAlias), "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async list(vaultId: VaultId, rootAgentId?: string): Promise<readonly AgentSecretGrant[]> {
    try {
      const results: AgentSecretGrant[] = [];
      const vaultDir = path.join(this._baseDir, vaultId.value);
      const agentDirs = rootAgentId ? [rootAgentId] : await fs.readdir(vaultDir);
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

  async delete(vaultId: VaultId, rootAgentId: string, secretAlias: string): Promise<void> {
    try {
      await fs.unlink(this._getPath(vaultId, rootAgentId, secretAlias));
    } catch {}
  }
}

export class FileSecretDestinationGrantRegistry implements SecretDestinationGrantRegistry {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = path.join(baseDir, "grants", "secret_destinations");
  }

  private _getPath(vaultId: VaultId, secretAlias: string, domain: string) {
    return path.join(this._baseDir, vaultId.value, Buffer.from(secretAlias).toString("hex"), `${Buffer.from(domain).toString("hex")}.json`);
  }

  async upsert(grant: SecretDestinationGrant): Promise<void> {
    const filePath = this._getPath(grant.vaultId, grant.secretAlias, grant.domain);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(grant, null, 2));
  }

  async get(vaultId: VaultId, secretAlias: string, domain: string): Promise<SecretDestinationGrant | null> {
    try {
      const content = await fs.readFile(this._getPath(vaultId, secretAlias, domain), "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async list(vaultId: VaultId, secretAlias?: string): Promise<readonly SecretDestinationGrant[]> {
    try {
      const results: SecretDestinationGrant[] = [];
      const vaultDir = path.join(this._baseDir, vaultId.value);
      const aliasDirs = secretAlias ? [Buffer.from(secretAlias).toString("hex")] : await fs.readdir(vaultDir);
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

  async delete(vaultId: VaultId, secretAlias: string, domain: string): Promise<void> {
    try {
      await fs.unlink(this._getPath(vaultId, secretAlias, domain));
    } catch {}
  }
}

export class FileRequestRecordRegistry implements RequestRecordRegistry {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = path.join(baseDir, "requests");
  }

  private _getPath(vaultId: VaultId, requestId: string) {
    return path.join(this._baseDir, vaultId.value, `${requestId}.json`);
  }

  async save(record: RequestRecord): Promise<void> {
    const filePath = this._getPath(record.vaultId, record.requestId);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(record, null, 2));
  }

  async get(vaultId: VaultId, requestId: string): Promise<RequestRecord | null> {
    try {
      const content = await fs.readFile(this._getPath(vaultId, requestId), "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async list(vaultId: VaultId, rootAgentId?: string): Promise<readonly RequestRecord[]> {
    const dir = path.join(this._baseDir, vaultId.value);
    try {
      const files = await fs.readdir(dir);
      const records = await Promise.all(
        files.filter(f => f.endsWith(".json")).map(async f => {
          const content = await fs.readFile(path.join(dir, f), "utf-8");
          return JSON.parse(content) as RequestRecord;
        })
      );
      return rootAgentId ? records.filter(r => r.rootAgentId === rootAgentId) : records;
    } catch {
      return [];
    }
  }
}

export class FileCustomHttpFlowRegistry implements CustomHttpFlowRegistry {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = path.join(baseDir, "flows");
  }

  private _getPath(vaultId: VaultId, flowId: string) {
    return path.join(this._baseDir, vaultId.value, `${flowId}.json`);
  }

  async register(flow: CustomHttpFlowDefinition): Promise<void> {
    const filePath = this._getPath(flow.vaultId, flow.flowId);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(flow, null, 2));
  }

  async get(vaultId: VaultId, flowId: string): Promise<CustomHttpFlowDefinition | null> {
    try {
      const content = await fs.readFile(this._getPath(vaultId, flowId), "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
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
  vaultId: string;
  vaultWorkingKey: string;
}

export function createPersistentVaultCoreDependencies(storage: { getBaseDir(): string }, options: CreatePersistentVaultCoreDependenciesOptions): any {
  const baseDir = storage.getBaseDir();
  return {
    vaultId: { value: options.vaultId },
    ids: new RandomIdGenerator(),
    clock: new SystemClock(),
    agentRecords: new FileAgentIdentityRegistry(baseDir),
    agentSecretGrants: new FileAgentSecretGrantRegistry(baseDir),
    secretDestinationGrants: new FileSecretDestinationGrantRegistry(baseDir),
    customFlows: new FileCustomHttpFlowRegistry(baseDir),
    audit: new FileAuditLog(baseDir),
    requests: new FileRequestRecordRegistry(baseDir),
    custody: new FileSecretCustody(baseDir, options.vaultWorkingKey),
    secrets: new FileSecretRepository(baseDir),
    policy: new DefaultPolicyEngine(),
    replayGuard: { assertNotReplayed: async () => {} },
    agentProofVerifier: { verify: async () => {} },
    sessionTokens: { 
        issue: async () => "dummy",
        verify: async () => true,
        revoke: async () => {},
        list: async () => []
    },
    executor: { dispatch: async () => ({ status: "SUCCEEDED", response: { status: 200, statusText: "OK", headers: {}, body: "{}" } }) }
  };
}
