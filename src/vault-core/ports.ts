import type {
  AgentSecretGrant,
  SecretDestinationGrant,
  RequestRecord,
  AgentIdentityRecord,
  AuditEntry,
  AuditQuery,
  CustomHttpFlowDefinition,
  DispatchInstruction,
  DispatchRequest,
  DispatchResult,
  SecretAlias,
  SecretId,
  SecretRecord,
  StoredSessionToken,
  VaultPrincipal,
  VaultWriteSecretCommand,
  VaultId,
} from "./contracts.js";

export interface SecretRepository {
  save(record: SecretRecord): Promise<void>;
  delete(secretId: SecretId): Promise<void>;
  getByAlias(alias: SecretAlias): Promise<SecretRecord | null>;
  getById(secretId: SecretId): Promise<SecretRecord | null>;
  list(vaultId: VaultId): Promise<readonly SecretRecord[]>;
}

export interface SecretCustody {
  store(secretId: SecretId, plaintext: string): Promise<void>;
  load(secretId: SecretId): Promise<string | null>;
  delete(secretId: SecretId): Promise<void>;
}

export interface PolicyEngine {
  authorizeWrite(command: VaultWriteSecretCommand): Promise<void>;
}

export interface AuditLog {
  append(entry: AuditEntry): Promise<void>;
  query(query: AuditQuery): Promise<readonly AuditEntry[]>;
}

export interface TrustedExecutor {
  dispatch(instruction: DispatchInstruction, secret: { record: SecretRecord; plaintext: string }): Promise<DispatchResult>;
}

export interface Clock {
  nowIso(): string;
}

export interface IdGenerator {
  newSecretId(): SecretId;
  newVersion(): { value: string };
  newAuditEntryId(): string;
  newAgentId(): string;
  newFlowId(): string;
  newRequestId(action?: string): string;
}

export interface AgentProofVerifier {
  verify(request: DispatchRequest): Promise<void>;
}

export interface ISessionTokenRegistry {
  issue(agentId: string): Promise<string>;
  verify(token: string, agentId: string): Promise<boolean>;
  revoke(token: string): Promise<void>;
  list(agentId?: string): Promise<readonly StoredSessionToken[]>;
}

export interface AgentIdentityRegistry {
  register(identity: AgentIdentityRecord): Promise<void>;
  get(vaultId: VaultId, agentId: string): Promise<AgentIdentityRecord | null>;
  list(vaultId: VaultId): Promise<readonly AgentIdentityRecord[]>;
}


export interface ReplayGuard {
  assertNotReplayed(request: DispatchRequest): Promise<void>;
}

export interface AgentSecretGrantRegistry {
  upsert(grant: AgentSecretGrant): Promise<void>;
  get(vaultId: VaultId, agentId: string, secretAlias: string): Promise<AgentSecretGrant | null>;
  list(vaultId: VaultId, agentId?: string): Promise<readonly AgentSecretGrant[]>;
  delete(vaultId: VaultId, agentId: string, secretAlias: string): Promise<void>;
}

export interface SecretDestinationGrantRegistry {
  upsert(grant: SecretDestinationGrant): Promise<void>;
  get(vaultId: VaultId, secretAlias: string, domain: string): Promise<SecretDestinationGrant | null>;
  list(vaultId: VaultId, secretAlias?: string): Promise<readonly SecretDestinationGrant[]>;
  delete(vaultId: VaultId, secretAlias: string, domain: string): Promise<void>;
}

export interface CustomHttpFlowRegistry {
  register(flow: CustomHttpFlowDefinition): Promise<void>;
  get(vaultId: VaultId, flowId: string): Promise<CustomHttpFlowDefinition | null>;
}

export interface RequestRecordRegistry {
  save(record: RequestRecord): Promise<void>;
  get(vaultId: VaultId, requestId: string): Promise<RequestRecord | null>;
  list(vaultId: VaultId, agentId?: string): Promise<readonly RequestRecord[]>;
}

export interface VaultCoreDependencies {
  vaultId: VaultId;
  secrets: SecretRepository;
  custody: SecretCustody;
  policy: PolicyEngine;
  audit: AuditLog;
  executor: TrustedExecutor;
  agentIdentities: AgentIdentityRegistry;
  agentSecretGrants: AgentSecretGrantRegistry;
  secretDestinationGrants: SecretDestinationGrantRegistry;
  requests: RequestRecordRegistry;
  customFlows: CustomHttpFlowRegistry;
  agentProofVerifier: AgentProofVerifier;
  replayGuard: ReplayGuard;
  sessionTokens: ISessionTokenRegistry;
  clock: Clock;
  ids: IdGenerator;
}
