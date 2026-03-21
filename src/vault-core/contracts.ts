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
  targetBindings: readonly VaultTargetBinding[];
  requestedAt: string;
  proof: OwnerProof;
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

export type VaultWriteSecretCommand =
  | OwnerWriteSecretCommand
  | IssuerWriteSecretCommand;

export interface OwnerRegisterAgentIdentityCommand {
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  agentIdentity: AgentIdentityRecord;
  requestedAt: string;
  proof: OwnerProof;
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
  proof: OwnerProof;
}

export interface OwnerRegisterCapabilityCommand {
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  capability: AgentCapability;
  requestedAt: string;
  proof: OwnerProof;
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

export interface OwnerProof {
  ownerId: string;
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

export interface DispatchResult {
  vaultId: VaultId;
  requestId: string;
  status: "succeeded" | "denied" | "failed";
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

export interface AuditEntry {
  entryId: string;
  occurredAt: string;
  vaultId: string;
  actor: VaultPrincipal;
  action:
    | "bootstrap_owner_identity"
    | "register_agent_identity"
    | "register_custom_flow"
    | "register_capability"
    | "write_secret"
    | "export_secret"
    | "reassign_alias"
    | "authorize_dispatch"
    | "dispatch_secret"
    | "read_audit";
  requestId?: string;
  capabilityId?: string;
  operation?: AgentCapability["operation"] | AuditEntry["action"];
  targetUrl?: string;
  secretAlias?: string;
  secretId?: string;
  outcome: "allowed" | "denied" | "succeeded" | "failed";
  detail: string;
}

export interface AgentIdentityRecord {
  vaultId: VaultId;
  agentId: string;
  publicKey: string;
}

export interface OwnerIdentityRecord {
  vaultId: VaultId;
  ownerId: string;
  publicKey: string;
}

export interface OwnerAuditRequest {
  vaultId: VaultId;
  actor: VaultPrincipal & { kind: "owner" };
  query: AuditQuery;
  requestId: string;
  requestedAt: string;
  proof: OwnerProof;
}

export interface OwnerExportSecretRequest {
  vaultId: VaultId;
  actor: VaultPrincipal & { kind: "owner" };
  alias: string;
  requestId: string;
  requestedAt: string;
  proof: OwnerProof;
}

export interface OwnerSecretExport {
  vaultId: VaultId;
  secretId: SecretId;
  alias: SecretAlias;
  plaintext: string;
  exportedAt: string;
}
