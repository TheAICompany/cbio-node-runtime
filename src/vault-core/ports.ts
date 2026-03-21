import type {
  AuditEntry,
  AuditQuery,
  AgentCapability,
  AgentIdentityRecord,
  OwnerIdentityRecord,
  OwnerAuditRequest,
  OwnerExportSecretRequest,
  OwnerRegisterCapabilityCommand,
  OwnerRegisterAgentIdentityCommand,
  OwnerRegisterCustomHttpFlowCommand,
  OwnerRegisterOwnerIdentityCommand,
  OwnerSecretExport,
  CustomHttpFlowDefinition,
  DispatchInstruction,
  DispatchRequest,
  DispatchResult,
  SecretAlias,
  SecretId,
  SecretRecord,
  VaultPrincipal,
  VaultWriteSecretCommand,
  VaultId,
} from "./contracts.js";

export interface SecretRepository {
  save(record: SecretRecord): Promise<void>;
  delete(secretId: SecretId): Promise<void>;
  getByAlias(alias: SecretAlias): Promise<SecretRecord | null>;
  getById(secretId: SecretId): Promise<SecretRecord | null>;
}

export interface SecretCustody {
  store(secretId: SecretId, plaintext: string): Promise<void>;
  load(secretId: SecretId): Promise<string | null>;
  delete(secretId: SecretId): Promise<void>;
}

export interface PolicyEngine {
  authorizeWrite(command: VaultWriteSecretCommand): Promise<void>;
  authorizeDispatch(request: DispatchRequest, record?: SecretRecord | null): Promise<void>;
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

export interface AgentIdentityRegistry {
  register(identity: AgentIdentityRecord): Promise<void>;
  get(vaultId: VaultId, agentId: string): Promise<AgentIdentityRecord | null>;
}

export interface OwnerIdentityRegistry {
  register(identity: OwnerIdentityRecord): Promise<void>;
  get(vaultId: VaultId, ownerId: string): Promise<OwnerIdentityRecord | null>;
  hasAny(vaultId: VaultId): Promise<boolean>;
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

export interface OwnerProofVerifier {
  verifyWrite(command: Extract<VaultWriteSecretCommand, { kind: "owner.write_secret" }>): Promise<void>;
  verifyAudit(request: OwnerAuditRequest): Promise<void>;
  verifyExport(request: OwnerExportSecretRequest): Promise<void>;
  verifyRegisterCapability(command: OwnerRegisterCapabilityCommand): Promise<void>;
  verifyRegisterAgentIdentity(command: OwnerRegisterAgentIdentityCommand): Promise<void>;
  verifyRegisterOwnerIdentity(command: OwnerRegisterOwnerIdentityCommand): Promise<void>;
  verifyRegisterCustomFlow(command: OwnerRegisterCustomHttpFlowCommand): Promise<void>;
}

export interface CustomHttpFlowRegistry {
  register(flow: CustomHttpFlowDefinition): Promise<void>;
  get(vaultId: VaultId, flowId: string): Promise<CustomHttpFlowDefinition | null>;
}

export interface CapabilityRegistry {
  register(capability: AgentCapability): Promise<void>;
  get(vaultId: VaultId, agentId: string, capabilityId: string): Promise<AgentCapability | null>;
}

export interface VaultCoreDependencies {
  vaultId: VaultId;
  secrets: SecretRepository;
  custody: SecretCustody;
  policy: PolicyEngine;
  audit: AuditLog;
  executor: TrustedExecutor;
  proofVerifier: AgentProofVerifier;
  agentIdentities: AgentIdentityRegistry;
  ownerProofVerifier: OwnerProofVerifier;
  ownerIdentities: OwnerIdentityRegistry;
  capabilities: CapabilityRegistry;
  customFlows: CustomHttpFlowRegistry;
  replayGuard: ReplayGuard;
  clock: Clock;
  ids: IdGenerator;
}

export interface VaultCore {
  readonly vaultId: VaultId;
  writeSecret(command: VaultWriteSecretCommand): Promise<SecretRecord>;
  authorizeDispatch(request: DispatchRequest): Promise<import("./contracts.js").DispatchAuthorization>;
  dispatchSecret(request: DispatchRequest): Promise<DispatchResult>;
  bootstrapOwnerIdentity(identity: OwnerIdentityRecord): Promise<void>;
  registerAgentIdentity(command: OwnerRegisterAgentIdentityCommand): Promise<void>;
  registerOwnerIdentity(command: OwnerRegisterOwnerIdentityCommand): Promise<void>;
  registerCapability(command: OwnerRegisterCapabilityCommand): Promise<void>;
  registerCustomFlow(command: OwnerRegisterCustomHttpFlowCommand): Promise<void>;
  getCapability(vaultId: VaultId, agentId: string, capabilityId: string): Promise<AgentCapability | null>;
  storeCustomFlowSecret(flow: CustomHttpFlowDefinition, alias: string, plaintext: string): Promise<SecretRecord>;
  getAudit(
    actor: VaultPrincipal & { kind: "owner" },
    query: AuditQuery,
    request?: Omit<OwnerAuditRequest, "actor" | "query" | "vaultId">,
  ): Promise<readonly AuditEntry[]>;
  exportSecret(
    actor: VaultPrincipal & { kind: "owner" },
    alias: string,
    request?: Omit<OwnerExportSecretRequest, "actor" | "alias" | "vaultId">,
  ): Promise<OwnerSecretExport>;
}
