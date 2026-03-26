import type {
  AuditEntry,
  AuditQuery,
  AgentCapability,
  AgentIdentityRecord,
  AgentProof,
  OwnerDefineSecretTargetsCommand,
  OwnerApproveCapabilityRequestCommand,
  OwnerDeleteSecretCommand,
  OwnerRejectCapabilityRequestCommand,
  OwnerExportSecretRequest,
  OwnerRegisterAgentIdentityCommand,
  OwnerRegisterCapabilityCommand,
  OwnerRegisterCustomHttpFlowCommand,
  OwnerRevokeCapabilityCommand,
  OwnerSecretExport,
  CustomHttpFlowDefinition,
  DispatchInstruction,
  DispatchRequest,
  DispatchResult,
  SecretAlias,
  SecretId,
  SecretRecord,
  SubmitCapabilityRequestCommand,
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
  authorizeDefineSecretTargets(command: OwnerDefineSecretTargetsCommand): Promise<void>;
  authorizeDispatch(request: DispatchRequest, record?: SecretRecord | null): Promise<void>;
  revokeCapability(vaultId: VaultId, agentId: string, capabilityId: string): Promise<number>;
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
}

export interface AgentProofVerifier {
  verify(request: DispatchRequest): Promise<void>;
}

export interface ISessionTokenRegistry {
  issue(agentId: string): Promise<string>;
  verify(token: string, agentId: string): Promise<boolean>;
  revoke(token: string): Promise<void>;
}

export interface AgentIdentityRegistry {
  register(identity: AgentIdentityRecord): Promise<void>;
  get(vaultId: VaultId, agentId: string): Promise<AgentIdentityRecord | null>;
  list(vaultId: VaultId): Promise<readonly AgentIdentityRecord[]>;
}


export interface ReplayGuard {
  assertNotReplayed(request: DispatchRequest): Promise<void>;
}

export interface RateLimitStore {
  consume(key: string, maxRequests: number, windowMs: number, nowMs: number): Promise<void>;
}

export interface CapabilityRevocationRegistry {
  get(vaultId: VaultId, agentId: string, capabilityId: string): Promise<number> | number;
  revoke(vaultId: VaultId, agentId: string, capabilityId: string): Promise<number> | number;
}

export interface CustomHttpFlowRegistry {
  register(flow: CustomHttpFlowDefinition): Promise<void>;
  get(vaultId: VaultId, flowId: string): Promise<CustomHttpFlowDefinition | null>;
}

export interface CapabilityRegistry {
  register(capability: AgentCapability): Promise<void>;
  get(vaultId: VaultId, agentId: string, capabilityId: string): Promise<AgentCapability | null>;
  list(vaultId: VaultId, agentId?: string): Promise<readonly AgentCapability[]>;
}

export interface VaultCoreDependencies {
  vaultId: VaultId;
  secrets: SecretRepository;
  custody: SecretCustody;
  policy: PolicyEngine;
  audit: AuditLog;
  executor: TrustedExecutor;
  agentIdentities: AgentIdentityRegistry;
  capabilities: CapabilityRegistry;
  customFlows: CustomHttpFlowRegistry;
  agentProofVerifier: AgentProofVerifier;
  replayGuard: ReplayGuard;
  sessionTokens: ISessionTokenRegistry;
  pendingRequests: IPendingRequestRegistry;
  pendingCapabilityRequests: IPendingCapabilityRequestRegistry;
  clock: Clock;
  ids: IdGenerator;
}

export interface IPendingRequestRegistry {
  save(record: import("./contracts.js").PendingDispatchRecord): Promise<void>;
  get(requestId: string): Promise<import("./contracts.js").PendingDispatchRecord | null>;
  list(vaultId: import("./contracts.js").VaultId): Promise<readonly import("./contracts.js").PendingDispatchRecord[]>;
  delete(requestId: string): Promise<void>;
}

export interface IPendingCapabilityRequestRegistry {
  save(record: import("./contracts.js").PendingCapabilityRequestRecord): Promise<void>;
  get(requestId: string): Promise<import("./contracts.js").PendingCapabilityRequestRecord | null>;
  list(vaultId: import("./contracts.js").VaultId): Promise<readonly import("./contracts.js").PendingCapabilityRequestRecord[]>;
  delete(requestId: string): Promise<void>;
}
