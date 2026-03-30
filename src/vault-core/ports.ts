import type {
  AgentSecretGrant,
  SecretDestinationGrant,
  OwnerPendingDispatchSubscription,
  OwnerAuditSubscription,
  RequestRecord,
  AgentIdentityRecord,
  AuditEntry,
  AuditQuery,

  DispatchInstruction,
  DispatchRequest,
  DispatchResult,
  SessionTokenInspectionResult,
  SecretAlias,
  SecretId,
  SecretVersion,
  SecretRecord,
  StoredSessionToken,
  VaultPrincipal,
  VaultWriteSecretCommand,
  VaultId,
} from "./contracts.js";

export interface SecretRepository {
  save(record: SecretRecord): Promise<void>;
  delete(secret_id: SecretId): Promise<void>;
  getByAlias(alias: SecretAlias): Promise<SecretRecord | null>;
  getById(secret_id: SecretId): Promise<SecretRecord | null>;
  list(vault_id: VaultId): Promise<readonly SecretRecord[]>;
}

export interface SecretCustody {
  store(secret_id: SecretId, plaintext: string): Promise<void>;
  load(secret_id: SecretId): Promise<string | null>;
  delete(secret_id: SecretId): Promise<void>;
}

export interface PolicyEngine {
  authorizeWrite(command: VaultWriteSecretCommand): Promise<void>;
}

export interface AuditLog {
  append(entry: AuditEntry): Promise<void>;
  query(query: AuditQuery): Promise<readonly AuditEntry[]>;
  subscribe(vault_id: VaultId, subscription: OwnerAuditSubscription): () => void;
}

export interface DispatchExecutor {
  dispatch(instruction: DispatchInstruction, secret: { record: SecretRecord; plaintext: string }): Promise<DispatchResult>;
}

export interface Clock {
  nowIso(): string;
}

export interface IdGenerator {
  newSecretId(): SecretId;
  newVersion(): SecretVersion;
  newAuditEntryId(): string;

  newRequestId(action?: string): string;
}

export interface AgentProofVerifier {
  verify(request: DispatchRequest): Promise<void>;
}

export interface ISessionTokenRegistry {
  issue(root_agent_id: string): Promise<string>;
  inspect(token: string, root_agent_id: string): Promise<SessionTokenInspectionResult>;
  revoke(token: string): Promise<void>;
  list(root_agent_id?: string): Promise<readonly StoredSessionToken[]>;
}

export interface AgentIdentityRegistry {
  register(identity: AgentIdentityRecord): Promise<void>;
  get(vault_id: VaultId, root_agent_id: string): Promise<AgentIdentityRecord | null>;
  list(vault_id: VaultId): Promise<readonly AgentIdentityRecord[]>;
}


export interface ReplayGuard {
  assertNotReplayed(request: DispatchRequest): Promise<void>;
}

export interface AgentSecretGrantRegistry {
  upsert(grant: AgentSecretGrant): Promise<void>;
  get(vault_id: VaultId, root_agent_id: string, secret_id: SecretId): Promise<AgentSecretGrant | null>;
  list(vault_id: VaultId, root_agent_id?: string): Promise<readonly AgentSecretGrant[]>;
  delete(vault_id: VaultId, root_agent_id: string, secret_id: SecretId): Promise<void>;
}

export interface SecretDestinationGrantRegistry {
  upsert(grant: SecretDestinationGrant): Promise<void>;
  get(vault_id: VaultId, secret_id: SecretId, site_id: string): Promise<SecretDestinationGrant | null>;
  list(vault_id: VaultId, secret_id?: SecretId): Promise<readonly SecretDestinationGrant[]>;
  delete(vault_id: VaultId, secret_id: SecretId, site_id: string): Promise<void>;
}



export interface RequestRecordRegistry {
  save(record: RequestRecord): Promise<void>;
  get(vault_id: VaultId, request_id: string): Promise<RequestRecord | null>;
  list(vault_id: VaultId, root_agent_id?: string): Promise<readonly RequestRecord[]>;
  subscribePending(vault_id: VaultId, subscription: OwnerPendingDispatchSubscription): () => void;
}

export interface VaultCoreDependencies {
  vault_id: VaultId;
  secrets: SecretRepository;
  custody: SecretCustody;
  policy: PolicyEngine;
  audit: AuditLog;
  executor: DispatchExecutor;
  agentRecords: AgentIdentityRegistry;
  agent_secretGrants: AgentSecretGrantRegistry;
  secret_destinationGrants: SecretDestinationGrantRegistry;
  requests: RequestRecordRegistry;

  agentProofVerifier: AgentProofVerifier;
  replayGuard: ReplayGuard;
  sessionTokenRegistry: ISessionTokenRegistry;
  clock: Clock;
  ids: IdGenerator;
}
