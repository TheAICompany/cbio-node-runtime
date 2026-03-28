export type AgentId = string; // Now represents rootAgentId

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

export type SecretLifecycleStatus =
  | "ACTIVE"
  | "SUPERSEDED"
  | "REMOVED";

export interface SecretRecord {
  vaultId: VaultId;
  secretId: SecretId;
  alias: SecretAlias;
  version: SecretVersion;
  lifecycleStatus: SecretLifecycleStatus;
  previousSecretId?: SecretId;
  supersededBySecretId?: SecretId;
  issuerId: string | null;
  source: SecretSource;
  createdAt: string;
  updatedAt: string;
  supersededAt?: string;
  removedAt?: string;
  retiredAt?: string;
}

export type SecretSource =
  | { kind: "manual" }
  | {
      kind: "request";
      requestId: string;
    };

export interface SecretSourceInput {
  kind: "manual" | "request";
  requestId?: string;
}

// ─── Grant Types ───────────────────────────────────────────────────────────────

export type GrantStatus = "pending" | "approved";

export interface AgentSecretGrant {
  vaultId: VaultId;
  rootAgentId: string;
  secretAlias: string;
  status: GrantStatus;
  requestedAt: string;
  grantedAt?: string;
}

export interface SecretDestinationGrant {
  vaultId: VaultId;
  secretAlias: string;
  siteId: string;
  status: GrantStatus;
  requestedAt: string;
  grantedAt?: string;
}

export type DispatchApprovalDecision = "allow_once" | "allow_and_grant" | "deny";

// ─── Secret Commands ───────────────────────────────────────────────────────────

export interface OwnerCreateSecretCommand {
  kind: "owner.create_secret";
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  alias: string;
  plaintext: string;
  source?: SecretSourceInput;
  requestedAt: string;
}

export interface OwnerUpdateSecretCommand {
  kind: "owner.update_secret";
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  alias: string;
  plaintext: string;
  source?: SecretSourceInput;
  requestedAt: string;
}

export interface IssuerWriteSecretCommand {
  kind: "issuer.write_secret";
  vaultId: VaultId;
  issuer: VaultPrincipal & { kind: "trusted_issuer" };
  alias: string;
  plaintext: string;
  issuerSiteId: string;
  source?: SecretSourceInput;
  requestedAt: string;
}

export interface OwnerDeleteSecretCommand {
  kind: "owner.remove_secret";
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  alias: string;
  requestedAt: string;
}

export type VaultWriteSecretCommand =
  | OwnerCreateSecretCommand
  | OwnerUpdateSecretCommand
  | IssuerWriteSecretCommand;

export interface OwnerRegisterAgentIdentityCommand {
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  agentRecord: AgentIdentityRecord;
  requestedAt: string;
}

export interface OwnerUpdateAgentIdentityCommand {
  vaultId: VaultId;
  requestId: string;
  owner: VaultPrincipal & { kind: "owner" };
  rootAgentId: string;
  nickname?: string;
  metadata?: Record<string, any>;
  requestedAt: string;
}

export interface OwnerGrantAgentSecretCommand {
  vaultId: VaultId;
  requestId: string;
  actor: VaultPrincipal & { kind: "owner" };
  rootAgentId: string;
  secretAlias: string;
  requestedAt: string;
}

export interface OwnerGrantSecretDestinationCommand {
  vaultId: VaultId;
  requestId: string;
  actor: VaultPrincipal & { kind: "owner" };
  secretAlias: string;
  siteId: string;
  requestedAt: string;
}

export interface OwnerRevokeAgentSecretCommand {
  vaultId: VaultId;
  requestId: string;
  actor: VaultPrincipal & { kind: "owner" };
  rootAgentId: string;
  secretAlias: string;
  requestedAt: string;
}

export interface OwnerRevokeSecretDestinationCommand {
  vaultId: VaultId;
  requestId: string;
  actor: VaultPrincipal & { kind: "owner" };
  secretAlias: string;
  siteId: string;
  requestedAt: string;
}





export interface AgentProof {
  rootAgentId: string;
  requestId: string;
  requestedAt: string;
  signature?: string;
  token?: string;
}

export interface AgentVisibleSecretRecord {
  vaultId: VaultId;
  secretId: SecretId;
  alias: SecretAlias;
  version: SecretVersion;
  lifecycleStatus: SecretLifecycleStatus;
  issuerId: string | null;
  source: SecretSource;
  createdAt: string;
  updatedAt: string;
  granted: boolean;
}

export interface AgentGetRuntimeManifestRequest {
  vaultId: VaultId;
  requestId: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
  requestedAt: string;
}

export interface AgentGetRuntimeManifestCommand {
  vaultId: VaultId;
  requestId: string;
  agent: VaultPrincipal & { kind: "agent" };
  requestedAt: string;
}

export interface AgentSelfContext {
  rootAgentId: string;
    publicKey: string;
  nickname?: string;
  metadata?: Record<string, any>;
}

export interface AgentRuntimeManifest {
  rootAgentId: string;
  vaultId: string;
  vaultNickname?: string;
  issuedAt: string;
  agent: AgentSelfContext;
  grants: {
    agentSecrets: readonly AgentSecretGrant[];
    secretDestinations: readonly SecretDestinationGrant[];
  };
  tools: readonly VaultToolDefinition[];
}

export interface RequestRecord {
  vaultId: VaultId;
  requestId: string;
  rootAgentId: string;
  reason: string;
  createdAt: string;
  request: {
    targetUrl: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    secretAlias?: string;
  };
  response?: {
    status?: number;
    headers?: Record<string, string>;
    body?: string;
    error?: string;
  };
  execution: {
    status: DispatchStatus;
  };
  missingGrants?: {
    agentSecret?: boolean;
    secretDestination?: boolean;
  };
}

export interface AgentVisibleRequestRecord {
  requestId: string;
  createdAt: string;
  reason: string;
  targetUrl: string;
  executionStatus: DispatchStatus;
  responseStatus?: number;
  error?: string;
  hasResponseBody: boolean;
}

export interface OwnerVisibleRequestRecord {
  requestId: string;
  createdAt: string;
  rootAgentId: string;
  reason: string;
  targetUrl: string;
  executionStatus: DispatchStatus;
  responseStatus?: number;
  error?: string;
  hasResponseBody: boolean;
  missingGrants?: {
    agentSecret?: boolean;
    secretDestination?: boolean;
  };
}

export interface OwnerRequestRecord {
  requestId: string;
  createdAt: string;
  rootAgentId: string;
  reason: string;
  request: {
    targetUrl: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    secretAlias?: string;
  };
  response?: {
    status?: number;
    headers?: Record<string, string>;
    body?: string;
    error?: string;
  };
  executionStatus: DispatchStatus;
  missingGrants?: {
    agentSecret?: boolean;
    secretDestination?: boolean;
  };
}

export interface VaultToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON-Schema
}

export interface AgentListGrantsRequest {
  vaultId: VaultId;
  requestId: string;
  requestedAt: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
}

export interface AgentListSecretsRequest {
  vaultId: VaultId;
  requestId: string;
  requestedAt: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
}

export interface AgentListRequestsRequest {
  vaultId: VaultId;
  requestId: string;
  requestedAt: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
}

export interface AgentGetRequestRequest {
  vaultId: VaultId;
  requestId: string;
  requestedAt: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
  targetRequestId: string;
}

export interface OwnerListRequestsRequest {
  vaultId: VaultId;
  requestId: string;
  actor: VaultPrincipal & { kind: "owner" };
  rootAgentId?: string;
  requestedAt: string;
}

export interface OwnerGetRequestRequest {
  vaultId: VaultId;
  requestId: string;
  actor: VaultPrincipal & { kind: "owner" };
  targetRequestId: string;
  requestedAt: string;
}

export interface OwnerApproveDispatchCommand {
  vaultId: VaultId;
  requestId: string;
  actor: VaultPrincipal & { kind: "owner" };
  decision: DispatchApprovalDecision;
  requestedAt: string;
}

export interface DispatchRequest {
  vaultId: VaultId;
  requestId: string;
  requestedAt: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
  secretAlias?: string;
  reason: string;
  targetUrl: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  skipReplayGuard?: boolean;
}

export type DispatchDecision = "allow" | "deny" | "pending";

export interface DispatchAuthorization {
  vaultId: VaultId;
  decision: DispatchDecision;
  reason: string | null;
  secretId: SecretId | null;
  missingGrants?: {
    agentSecret?: boolean;
    secretDestination?: boolean;
  };
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
  PENDING = "PENDING",
  STALLED = "STALLED",
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

export interface AgentRequestResult {
  requestId: string;
  executionStatus: DispatchStatus;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
}

export interface AuditQuery {
  vaultId: VaultId;
  actorId?: string;
  secretAlias?: string;
  requestId?: string;
  since?: string;
}

export enum AuditAction {
  REGISTER_AGENT_IDENTITY = "REGISTER_AGENT_IDENTITY",
  UPDATE_AGENT_IDENTITY = "UPDATE_AGENT_IDENTITY",

  GRANT_AGENT_SECRET = "GRANT_AGENT_SECRET",
  GRANT_SECRET_DESTINATION = "GRANT_SECRET_DESTINATION",
  REVOKE_AGENT_SECRET = "REVOKE_AGENT_SECRET",
  REVOKE_SECRET_DESTINATION = "REVOKE_SECRET_DESTINATION",
  WRITE_SECRET = "WRITE_SECRET",
  EXPORT_SECRET = "EXPORT_SECRET",
  REASSIGN_ALIAS = "REASSIGN_ALIAS",
  DELETE_SECRET = "DELETE_SECRET",
  EVALUATE_DISPATCH_POLICY = "EVALUATE_DISPATCH_POLICY",
  DISPATCH_SECRET = "DISPATCH_SECRET",
  LIST_AGENTS = "LIST_AGENTS",
  LIST_GRANTS = "LIST_GRANTS",
  LIST_REQUESTS = "LIST_REQUESTS",
  READ_REQUEST = "READ_REQUEST",
  READ_AUDIT = "READ_AUDIT",
  LIST_SECRETS = "LIST_SECRETS",
  ISSUE_SESSION_TOKEN = "ISSUE_SESSION_TOKEN",
  REVOKE_SESSION_TOKEN = "REVOKE_SESSION_TOKEN",
  APPROVE_DISPATCH = "APPROVE_DISPATCH",
  REJECT_DISPATCH = "REJECT_DISPATCH",
  PENDING_DISPATCH_APPROVAL = "PENDING_DISPATCH_APPROVAL",
}

export enum AuditOutcome {
  ALLOWED = "ALLOWED",
  DENIED = "DENIED",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  PENDING = "PENDING",
}

export interface AuditEntry {
  entryId: string;
  occurredAt: string;
  vaultId: VaultId;
  actor: VaultPrincipal;
  action: AuditAction;
  requestId?: string;
  targetUrl?: string;
  secretAlias?: string;
  secretId?: string;
  rootAgentId?: string;
  siteId?: string;
  outcome: AuditOutcome;
  detail: string;
}

export interface AgentIdentityRecord {
  vaultId: VaultId;
  rootAgentId: string;
    publicKey: string;
  privateKey?: string;
  metadata?: Record<string, any>;
  nickname?: string;
  sessionTokens?: readonly StoredSessionToken[];
}

export interface StoredSessionToken {
  token: string;
  rootAgentId: string;
  issuedAt: string;
  expiresAt?: string;
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

export interface OwnerListGrantsRequest {
  vaultId: VaultId;
  requestId: string;
  actor: VaultPrincipal & { kind: "owner" };
  rootAgentId?: string;
  secretAlias?: string;
  siteId?: string;
  requestedAt: string;
}

export interface OwnerIssueSessionTokenRequest {
  vaultId: VaultId;
  requestId: string;
  actor: VaultPrincipal & { kind: "owner" };
  rootAgentId: string;
  requestedAt: string;
}

export interface OwnerSessionToken {
  token: string;
  rootAgentId: string;
  issuedAt: string;
}
