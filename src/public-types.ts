/**
 * Public application-facing aliases.
 *
 * These names are intentionally stable and are meant to be used by downstream
 * service layers and dashboards instead of reaching for lower-level protocol
 * record names directly.
 */

export type OwnerClient = import("./clients/owner/index.js").VaultClient;
export type CreateOwnerClientOptions = import("./clients/owner/index.js").CreateVaultClientOptions;

export type OwnerAgentView = import("./vault-core/index.js").AgentIdentityRecord;
export type OwnerSecretView = import("./vault-core/index.js").AgentVisibleSecretRecord;
export type OwnerPendingApprovalView = import("./vault-core/index.js").CapabilityStateRecord;
export type OwnerRequestSummaryView = import("./vault-core/index.js").OwnerVisibleRequestRecord;
export type OwnerRequestDetailView = import("./vault-core/index.js").OwnerRequestRecord;
