export type {
  AgentId,
  AgentSecretGrant,
  SecretDestinationGrant,
  GrantStatus,
  AgentIdentityRecord,
  AgentRuntimeManifest,
  AgentRequestResult,
  OwnerRequestRecord,
  AgentRequestRecord,
  AuditEntry,
  DispatchApprovalDecision,

  DispatchAuthorization,
  DispatchInstruction,
  DispatchRequest,
  DispatchResult,
  OwnerAuditSubscription,
  RequestRecord,
  SecretAlias,
  SecretId,
  SecretLifecycleStatus,
  SecretRecord,
  VaultPrincipal,
  VaultPrincipalKind,
  VaultId,
} from "./vault-core/index.js";

export {
  DispatchStatus,
} from "./vault-core/index.js";

export type {
  VaultService,
  VaultAgentControlRequest,
  VaultAgentControlResponse,
  VaultOwnerControlRequest,
  VaultOwnerControlResponse,
} from "./vault-ingress/index.js";

export type {
  VaultAuditSseOptions,
  VaultPendingDispatchSseOptions,
} from "./vault-ingress/server-utils.js";

export type {
  AgentClient,
  AgentDispatchIntent,
  AgentAuditTestPingInput,
  AgentDispatchTransport,
  CreateAgentClientOptions,
} from "./clients/agent/index.js";

export type {
  OwnerClient,
  CreateOwnerClientOptions,
  OwnerCreateSecretInput,
  OwnerUpdateSecretInput,
  VaultGrantAgentSecretInput,
  VaultGrantSecretDestinationInput,
  VaultApproveDispatchInput,
} from "./clients/owner/index.js";
