export type VaultPrincipalKind =
  | "owner"
  | "trusted_issuer"
  | "agent"
  | "trusted_executor";

export interface VaultPrincipal {
  kind: VaultPrincipalKind;
  id: string;
}

export interface VaultId {
  readonly value: string;
}

export interface SecretId {
  readonly value: string;
}

export interface SecretAlias {
  readonly value: string;
}

export interface SecretVersion {
  readonly value: string;
}

export interface SecretRecord {
  vaultId: VaultId;
  secretId: SecretId;
  alias: SecretAlias;
  version: SecretVersion;
  issuerId: string | null;
  targetBindings: VaultTargetBinding[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultTargetBinding {
  kind: "owner" | "site";
  targetId: string;
  targetUrl?: string;
  methods?: readonly string[];
  paths?: readonly string[];
}

export interface OwnerWriteSecretCommand {
  kind: "owner.write_secret";
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  alias: string;
  plaintext: string;
  targetBindings?: readonly VaultTargetBinding[];
  requestedAt: string;
}

export interface OwnerDefineSecretTargetsCommand {
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  alias: string;
  targetBindings: readonly VaultTargetBinding[];
  requestedAt: string;
}

export interface IssuerWriteSecretCommand {
  kind: "issuer.write_secret";
  vaultId: VaultId;
  issuer: VaultPrincipal & { kind: "trusted_issuer" };
  alias: string;
  plaintext: string;
  issuerSiteId: string;
  targetBindings?: readonly VaultTargetBinding[];
  requestedAt: string;
}

export interface OwnerDeleteSecretCommand {
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  alias: string;
  requestedAt: string;
}

export type VaultWriteSecretCommand =
  | OwnerWriteSecretCommand
  | IssuerWriteSecretCommand;

export interface OwnerRegisterAgentIdentityCommand {
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  agentIdentity: AgentIdentityRecord;
  requestedAt: string;
}

export interface CustomHttpFlowDefinition {
  vaultId: VaultId;
  flowId: string;
  ownerId: string;
  mode: "acquire_secret" | "send_secret" | "bidirectional_secret";
  targetUrl: string;
  method: string;
  responseVisibility: "passthrough" | "shape_only";
  responseSecret?: {
    kind: "json_field";
    field: string;
    storeAlias: string;
  };
  createdAt: string;
}

export interface OwnerRegisterCustomHttpFlowCommand {
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  flow: {
    flowId: string;
    mode: "acquire_secret" | "send_secret" | "bidirectional_secret";
    targetUrl: string;
    method: string;
    responseVisibility: "passthrough" | "shape_only";
    responseSecret?: {
      kind: "json_field";
      field: string;
      storeAlias: string;
    };
  };
  requestedAt: string;
}

export interface OwnerRegisterCapabilityCommand {
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  capability: AgentCapability;
  requestedAt: string;
}

export interface OwnerRevokeCapabilityCommand {
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  agentId: string;
  capabilityId: string;
  requestedAt: string;
}

export interface AgentCapability {
  vaultId: VaultId;
  capabilityId: string;
  agentId: string;
  secretIds?: readonly string[];
  secretAliases?: readonly string[];
  operation: "dispatch_http" | "custom_http";
  customFlowId?: string;
  allowedTargets: readonly string[];
  allowedMethods: readonly string[];
  allowedPaths?: readonly string[];
  issuedAt: string;
  expiresAt?: string;
  revocationVersion?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  auditRequired?: boolean;
}

export interface AgentProof {
  agentId: string;
  signature: string;
  requestId: string;
  requestedAt: string;
}


export interface DispatchRequest {
  vaultId: VaultId;
  requestId: string;
  requestedAt: string;
  agent: VaultPrincipal & { kind: "agent" };
  capability: AgentCapability;
  proof: AgentProof;
  secretAlias?: string;
  targetUrl: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface DispatchAuthorization {
  vaultId: VaultId;
  decision: "allow" | "deny";
  reason: string | null;
  secretId: SecretId | null;
  executorTarget: VaultTargetBinding | null;
}

export interface DispatchInstruction {
  vaultId: VaultId;
  requestId: string;
  secretId: SecretId;
  targetUrl: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export enum DispatchStatus {
  SUCCEEDED = "SUCCEEDED",
  DENIED = "DENIED",
  FAILED = "FAILED",
}

export interface DispatchResult {
  vaultId: VaultId;
  requestId: string;
  status: DispatchStatus;
  targetUrl: string;
  method: string;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
}

export interface AuditQuery {
  actorId?: string;
  secretAlias?: string;
  requestId?: string;
  since?: string;
}

export enum AuditAction {
  REGISTER_AGENT_IDENTITY = "REGISTER_AGENT_IDENTITY",
  REGISTER_CUSTOM_FLOW = "REGISTER_CUSTOM_FLOW",
  REGISTER_CAPABILITY = "REGISTER_CAPABILITY",
  REVOKE_CAPABILITY = "REVOKE_CAPABILITY",
  WRITE_SECRET = "WRITE_SECRET",
  DEFINE_SECRET_TARGETS = "DEFINE_SECRET_TARGETS",
  EXPORT_SECRET = "EXPORT_SECRET",
  REASSIGN_ALIAS = "REASSIGN_ALIAS",
  DELETE_SECRET = "DELETE_SECRET",
  AUTHORIZE_DISPATCH = "AUTHORIZE_DISPATCH",
  DISPATCH_SECRET = "DISPATCH_SECRET",
  LIST_AGENTS = "LIST_AGENTS",
  LIST_CAPABILITIES = "LIST_CAPABILITIES",
  READ_AUDIT = "READ_AUDIT",
}

export enum AuditOutcome {
  ALLOWED = "ALLOWED",
  DENIED = "DENIED",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

export interface AuditEntry {
  entryId: string;
  occurredAt: string;
  vaultId: string;
  actor: VaultPrincipal;
  action: AuditAction;
  requestId?: string;
  capabilityId?: string;
  operation?: AgentCapability["operation"] | AuditAction;
  targetUrl?: string;
  secretAlias?: string;
  secretId?: string;
  agentId?: string;
  outcome: AuditOutcome;
  detail: string;
}

export interface AgentIdentityRecord {
  vaultId: VaultId;
  agentId: string;
  publicKey: string;
  privateKey?: string;
  metadata?: Record<string, any>;
  nickname?: string;
}


export interface OwnerAuditRequest {
  vaultId: VaultId;
  actor: VaultPrincipal & { kind: "owner" };
  query: AuditQuery;
  requestId: string;
  requestedAt: string;
}

export interface OwnerExportSecretRequest {
  vaultId: VaultId;
  actor: VaultPrincipal & { kind: "owner" };
  alias: string;
  requestId: string;
  requestedAt: string;
}

export interface OwnerSecretExport {
  vaultId: VaultId;
  secretId: SecretId;
  alias: SecretAlias;
  plaintext: string;
  exportedAt: string;
}

export interface OwnerListAgentsRequest {
  vaultId: VaultId;
  requestId: string;
  actor: VaultPrincipal & { kind: "owner" };
  requestedAt: string;
}

export interface OwnerListCapabilitiesRequest {
  vaultId: VaultId;
  requestId: string;
  actor: VaultPrincipal & { kind: "owner" };
  agentId?: string;
  requestedAt: string;
}
