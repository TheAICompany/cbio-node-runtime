export type AgentId = string; // Now represents root_agent_id

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
  vault_id: VaultId;
  secret_id: SecretId;
  alias: SecretAlias;
  version: SecretVersion;
  lifecycle_status: SecretLifecycleStatus;
  previousSecretId?: SecretId;
  supersededBySecretId?: SecretId;
  issuer_id: string | null;
  source: SecretSource;
  created_at: string;
  updated_at: string;
  supersededAt?: string;
  removedAt?: string;
  retiredAt?: string;
}

export type SecretSource =
  | { kind: "manual" }
  | {
      kind: "request";
      request_id: string;
    };

export interface SecretSourceInput {
  kind: "manual" | "request";
  request_id?: string;
}

// ─── Grant Types ───────────────────────────────────────────────────────────────

export type GrantStatus = "pending" | "approved";

export interface AgentSecretGrant {
  vault_id: VaultId;
  root_agent_id: string;
  secret_alias: string;
  status: GrantStatus;
  requested_at: string;
  granted_at?: string;
}

export interface SecretDestinationGrant {
  vault_id: VaultId;
  secret_alias: string;
  site_id: string;
  status: GrantStatus;
  requested_at: string;
  granted_at?: string;
}

export type DispatchApprovalDecision = "allow_once" | "allow_and_grant" | "deny";

// ─── Secret Commands ───────────────────────────────────────────────────────────

export interface OwnerCreateSecretCommand {
  kind: "owner.create_secret";
  vault_id: VaultId;
  request_id: string;
  owner: VaultPrincipal & { kind: "owner" };
  alias: string;
  plaintext: string;
  source?: SecretSourceInput;
  requested_at: string;
}

export interface OwnerUpdateSecretCommand {
  kind: "owner.update_secret";
  vault_id: VaultId;
  request_id: string;
  owner: VaultPrincipal & { kind: "owner" };
  alias: string;
  plaintext: string;
  source?: SecretSourceInput;
  requested_at: string;
}

export interface IssuerWriteSecretCommand {
  kind: "issuer.write_secret";
  vault_id: VaultId;
  issuer: VaultPrincipal & { kind: "trusted_issuer" };
  alias: string;
  plaintext: string;
  issuerSiteId: string;
  source?: SecretSourceInput;
  requested_at: string;
}

export interface OwnerDeleteSecretCommand {
  kind: "owner.remove_secret";
  vault_id: VaultId;
  request_id: string;
  owner: VaultPrincipal & { kind: "owner" };
  alias: string;
  requested_at: string;
}

export type VaultWriteSecretCommand =
  | OwnerCreateSecretCommand
  | OwnerUpdateSecretCommand
  | IssuerWriteSecretCommand;

export interface OwnerRegisterAgentIdentityCommand {
  vault_id: VaultId;
  request_id: string;
  owner: VaultPrincipal & { kind: "owner" };
  agentRecord: AgentIdentityRecord;
  requested_at: string;
}

export interface OwnerUpdateAgentIdentityCommand {
  vault_id: VaultId;
  request_id: string;
  owner: VaultPrincipal & { kind: "owner" };
  root_agent_id: string;
  nickname?: string;
  metadata?: Record<string, any>;
  requested_at: string;
}

export interface OwnerGrantAgentSecretCommand {
  vault_id: VaultId;
  request_id: string;
  actor: VaultPrincipal & { kind: "owner" };
  root_agent_id: string;
  secret_alias: string;
  requested_at: string;
}

export interface OwnerGrantSecretDestinationCommand {
  vault_id: VaultId;
  request_id: string;
  actor: VaultPrincipal & { kind: "owner" };
  secret_alias: string;
  site_id: string;
  requested_at: string;
}

export interface OwnerRevokeAgentSecretCommand {
  vault_id: VaultId;
  request_id: string;
  actor: VaultPrincipal & { kind: "owner" };
  root_agent_id: string;
  secret_alias: string;
  requested_at: string;
}

export interface OwnerRevokeSecretDestinationCommand {
  vault_id: VaultId;
  request_id: string;
  actor: VaultPrincipal & { kind: "owner" };
  secret_alias: string;
  site_id: string;
  requested_at: string;
}





export interface AgentProof {
  root_agent_id: string;
  request_id: string;
  requested_at: string;
  signature?: string;
  token?: string;
}

export interface AgentVisibleSecretRecord {
  vault_id: VaultId;
  secret_id: SecretId;
  alias: SecretAlias;
  version: SecretVersion;
  lifecycle_status: SecretLifecycleStatus;
  issuer_id: string | null;
  source: SecretSource;
  created_at: string;
  updated_at: string;
  granted: boolean;
}

export interface AgentGetRuntimeManifestRequest {
  vault_id: VaultId;
  request_id: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
  requested_at: string;
}

export interface AgentGetRuntimeManifestCommand {
  vault_id: VaultId;
  request_id: string;
  agent: VaultPrincipal & { kind: "agent" };
  requested_at: string;
}

export interface AgentSelfContext {
  root_agent_id: string;
    public_key: string;
  nickname?: string;
  metadata?: Record<string, any>;
}

export interface AgentRuntimeManifest {
  root_agent_id: string;
  vault_id: string;
  vault_nickname?: string;
  issued_at: string;
  agent: AgentSelfContext;
  grants: {
    agent_secrets: readonly AgentSecretGrant[];
    secret_destinations: readonly SecretDestinationGrant[];
  };
  tools: readonly VaultToolDefinition[];
}

export interface RequestRecord {
  vault_id: VaultId;
  request_id: string;
  root_agent_id: string;
  reason: string;
  created_at: string;
  requested_at: string;
  request: {
    target_url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    secret_alias?: string;
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
  missing_grants?: {
    agent_secret?: boolean;
    secret_destination?: boolean;
  };
}

export interface AgentVisibleRequestRecord {
  request_id: string;
  created_at: string;
  reason: string;
  target_url: string;
  execution_status: DispatchStatus;
  response_status?: number;
  error?: string;
  has_response_body: boolean;
}

export interface OwnerVisibleRequestRecord {
  request_id: string;
  created_at: string;
  root_agent_id: string;
  reason: string;
  target_url: string;
  execution_status: DispatchStatus;
  response_status?: number;
  error?: string;
  has_response_body: boolean;
  missing_grants?: {
    agent_secret?: boolean;
    secret_destination?: boolean;
  };
}

export interface OwnerRequestRecord {
  request_id: string;
  created_at: string;
  requested_at: string;
  root_agent_id: string;
  reason: string;
  request: {
    target_url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    secret_alias?: string;
  };
  response?: {
    status?: number;
    headers?: Record<string, string>;
    body?: string;
    error?: string;
  };
  execution_status: DispatchStatus;
  missing_grants?: {
    agent_secret?: boolean;
    secret_destination?: boolean;
  };
}

export interface AgentRequestRecord {
  request_id: string;
  created_at: string;
  requested_at: string;
  reason: string;
  request: {
    target_url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    secret_alias?: string;
  };
  response?: {
    status?: number;
    headers?: Record<string, string>;
    body?: string;
    error?: string;
  };
  execution_status: DispatchStatus;
}

export interface VaultToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON-Schema
}

export interface AgentListGrantsRequest {
  vault_id: VaultId;
  request_id: string;
  requested_at: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
}

export interface AgentListSecretsRequest {
  vault_id: VaultId;
  request_id: string;
  requested_at: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
}

export interface AgentListRequestsRequest {
  vault_id: VaultId;
  request_id: string;
  requested_at: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
}

export interface AgentGetRequestRequest {
  vault_id: VaultId;
  request_id: string;
  requested_at: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
  target_request_id: string;
}

export interface OwnerListRequestsRequest {
  vault_id: VaultId;
  request_id: string;
  actor: VaultPrincipal & { kind: "owner" };
  root_agent_id?: string;
  requested_at: string;
}

export interface OwnerGetRequestRequest {
  vault_id: VaultId;
  request_id: string;
  actor: VaultPrincipal & { kind: "owner" };
  target_request_id: string;
  requested_at: string;
}

export interface OwnerApproveDispatchCommand {
  vault_id: VaultId;
  request_id: string;
  actor: VaultPrincipal & { kind: "owner" };
  decision: DispatchApprovalDecision;
  requested_at: string;
}

export interface DispatchRequest {
  vault_id: VaultId;
  request_id: string;
  requested_at: string;
  agent: VaultPrincipal & { kind: "agent" };
  proof: AgentProof;
  secret_alias?: string;
  reason: string;
  target_url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  skipReplayGuard?: boolean;
}

export type DispatchDecision = "allow" | "deny" | "pending";

export interface DispatchAuthorization {
  vault_id: VaultId;
  decision: DispatchDecision;
  reason: string | null;
  secret_id: SecretId | null;
  missing_grants?: {
    agent_secret?: boolean;
    secret_destination?: boolean;
  };
}

export interface DispatchInstruction {
  vault_id: VaultId;
  request_id: string;
  secret_id: SecretId;
  target_url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export enum DispatchStatus {
  SUCCEEDED = "SUCCEEDED",
  DENIED = "DENIED",
  FAILED = "FAILED",
  IN_PROGRESS = "IN_PROGRESS",
  AWAITING_APPROVAL = "AWAITING_APPROVAL",
}

export interface DispatchResult {
  vault_id: VaultId;
  request_id: string;
  status: DispatchStatus;
  target_url: string;
  method: string;
  response_status?: number;
  response_headers?: Record<string, string>;
  response_body?: string;
  error?: string;
}

export type AgentRequestResult = AgentRequestRecord;

export interface AuditQuery {
  vault_id: string; // Changed from vault_id to align with others if needed, but keeping vault_id for now if it's an object? No, spec says vault_id is string.
  actor_id?: string;
  root_agent_id?: string;
  secret_alias?: string;
  request_id?: string;
  since?: string;
}

export enum AuditOperation {
  IDENTITY_REGISTER = "identity.register",
  IDENTITY_UPDATE = "identity.update",
  IDENTITY_ISSUE_TOKEN = "identity.issue_token",
  IDENTITY_REVOKE_TOKEN = "identity.revoke_token",

  GRANT_SECRET = "grant.grant_secret",
  GRANT_DESTINATION = "grant.grant_destination",
  REVOKE_SECRET = "grant.revoke_secret",
  REVOKE_DESTINATION = "grant.revoke_destination",

  SECRET_WRITE = "secret.write",
  SECRET_EXPORT = "secret.export",
  SECRET_DELETE = "secret.delete",

  POLICY_EVALUATE = "policy.evaluate_dispatch",
  SECRET_DISPATCH = "secret.dispatch",

  DISPATCH_APPROVE = "dispatch.approve",
  DISPATCH_REJECT = "dispatch.reject",
  DISPATCH_HOLD = "dispatch.pending_approval",

  MANAGEMENT_LIST_AGENTS = "management.list_agents",
  MANAGEMENT_LIST_GRANTS = "management.list_grants",
  MANAGEMENT_LIST_REQUESTS = "management.list_requests",
  MANAGEMENT_READ_REQUEST = "management.read_request",
  MANAGEMENT_READ_AUDIT = "management.read_audit",
  MANAGEMENT_LIST_SECRETS = "management.list_secrets",
}

export interface AuditEntry {
  event_id: string;
  ts: string;
  vault_id: string;
  actor: VaultPrincipal;
  operation: AuditOperation;
  decision: "allowed" | "denied";
  execution_status: "not_executed" | "succeeded" | "failed";
  request_id?: string;
  secret_alias?: string;
  secret_id?: string;
  root_agent_id?: string;
  site_id?: string;
  target?: {
    kind: "http" | "other";
    url: string;
  };
  detail: string;
  error_code?: string | null;
}

export interface AgentIdentityRecord {
  vault_id: VaultId;
  root_agent_id: string;
    public_key: string;
  private_key?: string;
  metadata?: Record<string, any>;
  nickname?: string;
  session_token?: StoredSessionToken;
}

export interface StoredSessionToken {
  token: string;
  root_agent_id: string;
  issued_at: string;
}

export type SessionTokenInspectionResult =
  | { ok: true; token: StoredSessionToken }
  | { ok: false; reason: "token_not_found" | "agent_mismatch" };

export interface OwnerAuditRequest {
  vault_id: VaultId;
  actor: VaultPrincipal & { kind: "owner" };
  query: AuditQuery;
  request_id: string;
  requested_at: string;
}

export interface OwnerExportSecretRequest {
  vault_id: VaultId;
  actor: VaultPrincipal & { kind: "owner" };
  alias: string;
  request_id: string;
  requested_at: string;
}

export interface OwnerSecretExport {
  vault_id: VaultId;
  secret_id: SecretId;
  alias: SecretAlias;
  plaintext: string;
  exported_at: string;
}

export interface OwnerListAgentsRequest {
  vault_id: VaultId;
  request_id: string;
  actor: VaultPrincipal & { kind: "owner" };
  requested_at: string;
}

export interface OwnerListGrantsRequest {
  vault_id: VaultId;
  request_id: string;
  actor: VaultPrincipal & { kind: "owner" };
  root_agent_id?: string;
  secret_alias?: string;
  site_id?: string;
  requested_at: string;
}

export interface OwnerIssueSessionTokenRequest {
  vault_id: VaultId;
  request_id: string;
  actor: VaultPrincipal & { kind: "owner" };
  root_agent_id: string;
  requested_at: string;
}

export interface OwnerSessionToken {
  token: string;
  root_agent_id: string;
  issued_at: string;
}
