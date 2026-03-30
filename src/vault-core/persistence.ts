import * as path from "node:path";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import type Database from "better-sqlite3";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
import {
  DispatchStatus,
  type AgentSecretGrant,
  type SecretDestinationGrant,
  type OwnerAuditSubscription,
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
  type SecretVersion,
  type VaultId,
} from "./contracts.js";
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



export class SqliteSecretRepository implements SecretRepository {
  constructor(private db: Database.Database) {}
  async save(record: SecretRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO secrets (secret_id, vault_id, alias, record)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(secret_id) DO UPDATE SET record = excluded.record, alias = excluded.alias
    `);
    stmt.run(record.secret_id, record.vault_id, record.alias, JSON.stringify(record));
  }
  async delete(secret_id: SecretId): Promise<void> {
    this.db.prepare(`DELETE FROM secrets WHERE secret_id = ?`).run(secret_id);
  }
  async getByAlias(alias: string): Promise<SecretRecord | null> {
    const row = this.db.prepare(`SELECT record FROM secrets WHERE alias = ?`).get(alias) as { record: string } | undefined;
    return row ? JSON.parse(row.record) : null;
  }
  async list(vault_id: VaultId): Promise<readonly SecretRecord[]> {
    const rows = this.db.prepare(`SELECT record FROM secrets WHERE vault_id = ?`).all(vault_id) as { record: string }[];
    return rows.map(r => JSON.parse(r.record));
  }
  async getById(secret_id: SecretId): Promise<SecretRecord | null> {
    const row = this.db.prepare(`SELECT record FROM secrets WHERE secret_id = ?`).get(secret_id) as { record: string } | undefined;
    return row ? JSON.parse(row.record) : null;
  }
}

// AES-GCM Implementation
const ALGORITHM = "aes-256-gcm";

export class SqliteSecretCustody implements SecretCustody {
  private keyBuffer: Buffer;
  constructor(private db: Database.Database, workingKey: string) {
    this.keyBuffer = Buffer.from(workingKey, 'base64url');
  }
  async store(secret_id: SecretId, plaintext: string): Promise<void> {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, this.keyBuffer, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = JSON.stringify({
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      ciphertext: encrypted.toString('hex')
    });
    this.db.prepare(`INSERT INTO custody (secret_id, encrypted_payload) VALUES (?, ?) ON CONFLICT(secret_id) DO UPDATE SET encrypted_payload = excluded.encrypted_payload`).run(secret_id, payload);
  }
  async load(secret_id: SecretId): Promise<string | null> {
    const row = this.db.prepare(`SELECT encrypted_payload FROM custody WHERE secret_id = ?`).get(secret_id) as { encrypted_payload: string } | undefined;
    if (!row) return null;
    try {
      const data = JSON.parse(row.encrypted_payload);
      const iv = Buffer.from(data.iv, 'hex');
      const tag = Buffer.from(data.tag, 'hex');
      const encrypted = Buffer.from(data.ciphertext, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, this.keyBuffer, iv);
      decipher.setAuthTag(tag);
      return decipher.update(encrypted as any, undefined, 'utf8') + decipher.final('utf8');
    } catch {
      return null;
    }
  }
  async delete(secret_id: SecretId): Promise<void> {
    this.db.prepare(`DELETE FROM custody WHERE secret_id = ?`).run(secret_id);
  }
}

export class SqliteAuditLog implements AuditLog {
  private static subscribers = new Map<string, Set<(entry: AuditEntry) => void>>();
  private get subscribers() { return SqliteAuditLog.subscribers; }
  constructor(private db: Database.Database) {}
  async append(entry: AuditEntry): Promise<void> {
    this.db.prepare(`INSERT INTO audit_logs (event_id, vault_id, function_name, actor_id, root_agent_id, secret_id, request_id, ts, entry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        entry.event_id,
        entry.vault_id,
        entry.function_name,
        entry.actor.id,
        entry.input?.root_agent_id || null,
        entry.input?.secret_id || null,
        entry.input?.request_id || null,
        entry.ts,
        JSON.stringify(entry)
      );
    const subs = this.subscribers.get(entry.vault_id);
    if (subs) {
      for (const cb of subs) cb(entry);
    }
  }
  async query(query: AuditQuery): Promise<readonly AuditEntry[]> {
    let sql = `SELECT entry FROM audit_logs WHERE vault_id = ?`;
    const params: any[] = [query.vault_id];
    if (query.actor_id) { sql += ` AND actor_id = ?`; params.push(query.actor_id); }
    if (query.root_agent_id) { sql += ` AND root_agent_id = ?`; params.push(query.root_agent_id); }
    if (query.secret_id) { sql += ` AND secret_id = ?`; params.push(query.secret_id); }
    if (query.request_id) { sql += ` AND request_id = ?`; params.push(query.request_id); }
    if (query.since) { sql += ` AND ts >= ?`; params.push(query.since); }
    sql += ` ORDER BY ts ASC LIMIT 1000`;
    const rows = this.db.prepare(sql).all(...params) as { entry: string }[];
    return rows.map(r => JSON.parse(r.entry));
  }
  subscribe(vault_id: VaultId, subscription: OwnerAuditSubscription): () => void {
    const replay = this.db.prepare(`SELECT entry FROM audit_logs WHERE vault_id = ? ORDER BY ts ASC LIMIT 1000`)
      .all(vault_id) as { entry: string }[];
    for (const row of replay) {
      const entry = JSON.parse(row.entry) as AuditEntry;
      if (matchesAuditSubscription(entry, subscription)) {
        subscription.onEvent(entry);
      }
    }

    let subs = this.subscribers.get(vault_id);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(vault_id, subs);
    }
    const callback = (entry: AuditEntry) => {
      if (subscription.afterEventId && entry.event_id <= subscription.afterEventId) return;
      if (subscription.function_names && !subscription.function_names.includes(entry.function_name)) return;
      if (subscription.root_agent_id && entry.input?.root_agent_id !== subscription.root_agent_id) return;
      if (subscription.request_id && entry.input?.request_id !== subscription.request_id) return;
      subscription.onEvent(entry);
    };
    subs.add(callback);
    return () => {
      const current = this.subscribers.get(vault_id);
      if (current) {
        current.delete(callback);
        if (current.size === 0) this.subscribers.delete(vault_id);
      }
    };
  }
}

function matchesAuditSubscription(entry: AuditEntry, subscription: OwnerAuditSubscription): boolean {
  if (subscription.afterEventId && entry.event_id <= subscription.afterEventId) return false;
  if (subscription.function_names && !subscription.function_names.includes(entry.function_name)) return false;
  if (subscription.root_agent_id && entry.input?.root_agent_id !== subscription.root_agent_id) return false;
  if (subscription.request_id && entry.input?.request_id !== subscription.request_id) return false;
  return true;
}

export class SqliteAgentIdentityRegistry implements AgentIdentityRegistry {
  constructor(private db: Database.Database, private custody: SecretCustody) {}
  async register(identity: AgentIdentityRecord): Promise<void> {
    const { private_key, ...metadata } = identity;
    if (private_key) {
      await this.custody.store(identity.root_agent_id, private_key);
    }
    this.db.prepare(`INSERT INTO agents (vault_id, root_agent_id, record) VALUES (?, ?, ?) ON CONFLICT(vault_id, root_agent_id) DO UPDATE SET record = excluded.record`).run(identity.vault_id, identity.root_agent_id, JSON.stringify(metadata));
  }
  async get(vault_id: VaultId, root_agent_id: string): Promise<AgentIdentityRecord | null> {
    const row = this.db.prepare(`SELECT record FROM agents WHERE vault_id = ? AND root_agent_id = ?`).get(vault_id, root_agent_id) as { record: string } | undefined;
    if (!row) return null;
    let record = JSON.parse(row.record);

    // Lazy migration: if private key is found in plain text in the record, move it to custody
    if (record.private_key) {
      const pk = record.private_key;
      delete record.private_key;
      await this.custody.store(root_agent_id, pk);
      this.db.prepare(`UPDATE agents SET record = ? WHERE vault_id = ? AND root_agent_id = ?`).run(JSON.stringify(record), vault_id, root_agent_id);
    } else {
      const private_key = await this.custody.load(root_agent_id);
      if (private_key) record.private_key = private_key;
    }
    return record;
  }
  async list(vault_id: VaultId): Promise<readonly AgentIdentityRecord[]> {
    const rows = this.db.prepare(`SELECT record FROM agents WHERE vault_id = ?`).all(vault_id) as { record: string }[];
    return Promise.all(rows.map(async (r) => {
      let record = JSON.parse(r.record);
      if (record.private_key) {
          const pk = record.private_key;
          delete record.private_key;
          await this.custody.store(record.root_agent_id, pk);
          this.db.prepare(`UPDATE agents SET record = ? WHERE vault_id = ? AND root_agent_id = ?`).run(JSON.stringify(record), vault_id, record.root_agent_id);
      } else {
          const private_key = await this.custody.load(record.root_agent_id);
          if (private_key) record.private_key = private_key;
      }
      return record;
    }));
  }

  async delete(vault_id: VaultId, root_agent_id: string): Promise<void> {
    this.db
      .prepare(`DELETE FROM agents WHERE vault_id = ? AND root_agent_id = ?`)
      .run(vault_id, root_agent_id);
    await this.custody.delete(root_agent_id);
  }
}

export class SqliteAgentSecretGrantRegistry implements AgentSecretGrantRegistry {
  constructor(private db: Database.Database) {}
  async upsert(grant: AgentSecretGrant): Promise<void> {
    this.db.prepare(`INSERT INTO grants (vault_id, root_agent_id, secret_id, record) VALUES (?, ?, ?, ?) ON CONFLICT(vault_id, root_agent_id, secret_id) DO UPDATE SET record = excluded.record`).run(grant.vault_id, grant.root_agent_id, grant.secret_id, JSON.stringify(grant));
  }
  async get(vault_id: VaultId, root_agent_id: string, secret_id: SecretId): Promise<AgentSecretGrant | null> {
    const row = this.db.prepare(`SELECT record FROM grants WHERE vault_id = ? AND root_agent_id = ? AND secret_id = ?`).get(vault_id, root_agent_id, secret_id) as { record: string } | undefined;
    return row ? JSON.parse(row.record) : null;
  }
  async list(vault_id: VaultId, root_agent_id?: string): Promise<readonly AgentSecretGrant[]> {
    let sql = `SELECT record FROM grants WHERE vault_id = ?`;
    const params: any[] = [vault_id];
    if (root_agent_id) { sql += ` AND root_agent_id = ?`; params.push(root_agent_id); }
    const rows = this.db.prepare(sql).all(...params) as { record: string }[];
    return rows.map(r => JSON.parse(r.record));
  }
  async delete(vault_id: VaultId, root_agent_id: string, secret_id: SecretId): Promise<void> {
    this.db.prepare(`DELETE FROM grants WHERE vault_id = ? AND root_agent_id = ? AND secret_id = ?`).run(vault_id, root_agent_id, secret_id);
  }
}

export class SqliteSecretDestinationGrantRegistry implements SecretDestinationGrantRegistry {
  constructor(private db: Database.Database) {}
  async upsert(grant: SecretDestinationGrant): Promise<void> {
    this.db.prepare(`INSERT INTO destination_grants (vault_id, secret_id, site_id, record) VALUES (?, ?, ?, ?) ON CONFLICT(vault_id, secret_id, site_id) DO UPDATE SET record = excluded.record`).run(grant.vault_id, grant.secret_id, grant.site_id, JSON.stringify(grant));
  }
  async get(vault_id: VaultId, secret_id: SecretId, site_id: string): Promise<SecretDestinationGrant | null> {
    const row = this.db.prepare(`SELECT record FROM destination_grants WHERE vault_id = ? AND secret_id = ? AND site_id = ?`).get(vault_id, secret_id, site_id) as { record: string } | undefined;
    return row ? JSON.parse(row.record) : null;
  }
  async list(vault_id: VaultId, secret_id?: SecretId): Promise<readonly SecretDestinationGrant[]> {
    let sql = `SELECT record FROM destination_grants WHERE vault_id = ?`;
    const params: any[] = [vault_id];
    if (secret_id) { sql += ` AND secret_id = ?`; params.push(secret_id); }
    const rows = this.db.prepare(sql).all(...params) as { record: string }[];
    return rows.map(r => JSON.parse(r.record));
  }
  async delete(vault_id: VaultId, secret_id: SecretId, site_id: string): Promise<void> {
    this.db.prepare(`DELETE FROM destination_grants WHERE vault_id = ? AND secret_id = ? AND site_id = ?`).run(vault_id, secret_id, site_id);
  }
}

export class SqliteRequestRecordRegistry implements RequestRecordRegistry {
  private static subscribers = new Map<string, Set<(record: RequestRecord) => void>>();
  private get subscribers() { return SqliteRequestRecordRegistry.subscribers; }
  constructor(private db: Database.Database) {}
  async save(record: RequestRecord): Promise<void> {
    this.db.prepare(`INSERT INTO requests (vault_id, request_id, root_agent_id, secret_id, record) VALUES (?, ?, ?, ?, ?) ON CONFLICT(request_id) DO UPDATE SET record = excluded.record, secret_id = excluded.secret_id`).run(
      record.vault_id, 
      record.request_id, 
      record.root_agent_id, 
      record.request.secret_id ?? null,
      JSON.stringify(record)
    );
    const subs = this.subscribers.get(record.vault_id);
    if (subs) {
      for (const cb of subs) cb(record);
    }
  }
  async get(vault_id: VaultId, request_id: string): Promise<RequestRecord | null> {
    const row = this.db.prepare(`SELECT record FROM requests WHERE vault_id = ? AND request_id = ?`).get(vault_id, request_id) as { record: string } | undefined;
    return row ? JSON.parse(row.record) : null;
  }
  async list(vault_id: VaultId, root_agent_id?: string): Promise<readonly RequestRecord[]> {
    let sql = `SELECT record FROM requests WHERE vault_id = ?`;
    const params: any[] = [vault_id];
    if (root_agent_id) { sql += ` AND root_agent_id = ?`; params.push(root_agent_id); }
    const rows = this.db.prepare(sql).all(...params) as { record: string }[];
    return rows.map(r => JSON.parse(r.record));
  }
  subscribePending(vault_id: VaultId, subscription: OwnerPendingDispatchSubscription): () => void {
    const rows = this.db.prepare(`SELECT record FROM requests WHERE vault_id = ?`).all(vault_id) as { record: string }[];
    const replay = rows.map(r => JSON.parse(r.record) as RequestRecord)
      .filter((record) => record.execution.status === DispatchStatus.AWAITING_APPROVAL && !!record.pending_dispatch_event)
      .map((record) => ({
        event_id: record.pending_dispatch_event!.event_id,
        emitted_at: record.pending_dispatch_event!.emitted_at,
        record
      } as PendingDispatchEvent))
      .filter((event) => !subscription.afterEventId || event.event_id > subscription.afterEventId)
      .sort((a, b) => a.event_id.localeCompare(b.event_id));
    for (const event of replay) subscription.onEvent(event);

    let subs = this.subscribers.get(vault_id);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(vault_id, subs);
    }
    const callback = (record: RequestRecord) => {
      if (record.execution.status !== DispatchStatus.AWAITING_APPROVAL || !record.pending_dispatch_event) return;
      const event: PendingDispatchEvent = {
        event_id: record.pending_dispatch_event.event_id,
        emitted_at: record.pending_dispatch_event.emitted_at,
        record,
      };
      if (subscription.afterEventId && event.event_id <= subscription.afterEventId) return;
      subscription.onEvent(event);
    };
    subs.add(callback);
    return () => {
      const current = this.subscribers.get(vault_id);
      if (current) {
        current.delete(callback);
        if (current.size === 0) this.subscribers.delete(vault_id);
      }
    };
  }
}

export class SqliteSessionTokenRegistry implements ISessionTokenRegistry {
  constructor(private db: Database.Database) {}
  async issue(root_agent_id: string): Promise<string> {
    const token = `sat_${crypto.randomBytes(16).toString("hex")}`;
    const stored: StoredSessionToken = { token, root_agent_id, issued_at: new Date().toISOString() };
    this.db.prepare(`INSERT INTO session_tokens (root_agent_id, token, record) VALUES (?, ?, ?) ON CONFLICT(root_agent_id) DO UPDATE SET record = excluded.record, token = excluded.token`).run(root_agent_id, token, JSON.stringify(stored));
    return token;
  }
  async inspect(token: string, root_agent_id: string): Promise<SessionTokenInspectionResult> {
    const row = this.db.prepare(`SELECT record, root_agent_id FROM session_tokens WHERE token = ?`).get(token) as { record: string, root_agent_id: string } | undefined;
    if (!row) return { ok: false, reason: "token_not_found" };
    if (row.root_agent_id !== root_agent_id) return { ok: false, reason: "agent_mismatch" };
    return { ok: true, token: JSON.parse(row.record) };
  }
  async revoke(token: string): Promise<void> {
    this.db.prepare(`DELETE FROM session_tokens WHERE token = ?`).run(token);
  }
  async list(root_agent_id?: string): Promise<readonly StoredSessionToken[]> {
    let sql = `SELECT record FROM session_tokens`;
    const params: any[] = [];
    if (root_agent_id) { sql += ` WHERE root_agent_id = ?`; params.push(root_agent_id); }
    const rows = this.db.prepare(sql).all(...params) as { record: string }[];
    return rows.map(r => JSON.parse(r.record));
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

const dbCache = new Map<string, Database.Database>();

function initDb(baseDir: string): Database.Database {
  if (dbCache.has(baseDir)) return dbCache.get(baseDir)!;
  const Database = require("better-sqlite3");
  const dbPath = path.join(baseDir, "vault.sqlite");
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS secrets (secret_id TEXT PRIMARY KEY, vault_id TEXT, alias TEXT UNIQUE, record TEXT);
    CREATE TABLE IF NOT EXISTS custody (secret_id TEXT PRIMARY KEY, encrypted_payload TEXT);
    CREATE TABLE IF NOT EXISTS audit_logs (
      event_id TEXT PRIMARY KEY,
      vault_id TEXT,
      function_name TEXT,
      actor_id TEXT,
      root_agent_id TEXT,
      secret_id TEXT,
      request_id TEXT,
      ts TEXT,
      entry TEXT
    );
    CREATE TABLE IF NOT EXISTS agents (vault_id TEXT, root_agent_id TEXT, record TEXT, PRIMARY KEY(vault_id, root_agent_id));
    CREATE TABLE IF NOT EXISTS grants (vault_id TEXT, root_agent_id TEXT, secret_id TEXT, record TEXT, PRIMARY KEY(vault_id, root_agent_id, secret_id));
    CREATE TABLE IF NOT EXISTS destination_grants (vault_id TEXT, secret_id TEXT, site_id TEXT, record TEXT, PRIMARY KEY(vault_id, secret_id, site_id));
    CREATE TABLE IF NOT EXISTS requests (vault_id TEXT, request_id TEXT PRIMARY KEY, root_agent_id TEXT, secret_id TEXT, record TEXT);
    CREATE TABLE IF NOT EXISTS session_tokens (root_agent_id TEXT PRIMARY KEY, token TEXT UNIQUE, record TEXT);
  `);
  dbCache.set(baseDir, db);
  return db;
}

export function createPersistentVaultCoreDependencies(storage: { getBaseDir(): string }, options: CreatePersistentVaultCoreDependenciesOptions): VaultCoreDependencies {
  const baseDir = storage.getBaseDir();
  // Ensure black-box environment directory exists synchronously.
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  const db = initDb(baseDir);
  const custody = new SqliteSecretCustody(db, options.vaultWorkingKey);
  const agentRecords = new SqliteAgentIdentityRegistry(db, custody);
  const sessionTokenRegistry = new SqliteSessionTokenRegistry(db);
  return {
    vault_id: options.vault_id,
    ids: new RandomIdGenerator(),
    clock: new SystemClock(),
    agentRecords,
    agent_secretGrants: new SqliteAgentSecretGrantRegistry(db),
    secret_destinationGrants: new SqliteSecretDestinationGrantRegistry(db),
    audit: new SqliteAuditLog(db),
    requests: new SqliteRequestRecordRegistry(db),
    custody,
    secrets: new SqliteSecretRepository(db),
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
