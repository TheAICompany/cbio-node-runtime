/**
 * Runtime export.
 * Main API: typed high-level runtime plus supported low-level building blocks.
 */

export { IdentityError, IdentityErrorCode, OwnerClientError, OwnerClientErrorCode } from "../errors.js";
export { derivePublicKey, LocalSigner, type Signer, deriveVaultWorkingKeyFromPassword } from "../protocol/crypto.js";
export { deriveRootAgentId } from "../protocol/identity.js";
export type { IStorageProvider } from "../storage/provider.js";
export { FsStorageProvider } from "../storage/fs.js";
export { MemoryStorageProvider } from "../storage/memory.js";
export {
  createIdentity,
  restoreIdentity,
  type CreateIdentityOptions,
  type RestoreIdentityOptions,
  type CreatedIdentity,
} from "./identity.js";
export {
  readVaultProfile,
  writeVaultProfile,
  type VaultProfile,
} from "./vault-metadata.js";
export {
  createWorkspaceStorage,
  getDefaultWorkspaceDir,
} from "./workspace-storage.js";
export {
  createVault,
  recoverVault,
  listVaults,
  updateVaultMetadata,
  type CreateVaultOptions,
  type CreatedVault,
  type RecoverVaultOptions,
  type RecoveredVault,
  type VaultObject,
  type VaultMetadata,
} from "./bootstrap.js";
export {
  openOwnerSession,
  type OwnerSession,
  type OpenOwnerSessionOptions,
} from "./owner-session.js";

export {
  createVaultCore,
  VaultCore,
  VaultCoreError,
  createVaultCoreDependencies,
  type VaultCoreDependenciesOptions,
  type DefaultPolicyEngineOptions,
  DefaultPolicyEngine,
  createPersistentVaultCoreDependencies,
  initializeVaultCustody,
  recoverVaultWorkingKey,
  DEFAULT_VAULT_KEY_CUSTODY_BLOB_KEY,
  type InitializeVaultCustodyOptions,
  type InitializedVaultCustody,
  type CreatePersistentVaultCoreDependenciesOptions,
  PersistentVaultAgentIdentityRegistry,
  PersistentVaultAuditLog,
  PersistentVaultAgentSecretGrantRegistry,
  PersistentVaultSecretDestinationGrantRegistry,

  PersistentVaultSecretCustody,
  PersistentVaultSecretRepository,
} from "../vault-core/index.js";

export type {
  AgentId,
  AgentSecretGrant,
  SecretDestinationGrant,
  GrantStatus,
  AgentIdentityRecord,
  AgentRuntimeManifest,
  AgentRequestRecord,
  OwnerRequestRecord,
  AgentRequestResult,
  DispatchApprovalDecision,

  AuditEntry,
  DispatchAuthorization,
  DispatchInstruction,
  DispatchRequest,
  DispatchResult,
  PendingDispatchEvent,
  OwnerPendingDispatchSubscription,
  OwnerAuditSubscription,
  RequestRecord,
  SecretAlias,
  SecretId,
  SecretLifecycleStatus,
  SecretRecord,
  VaultPrincipal,
  VaultPrincipalKind,
  VaultId,
} from "../vault-core/index.js";

export {
  DispatchStatus,
} from "../vault-core/index.js";

export {
  createOwnerClient,
  type OwnerClient,
  type CreateOwnerClientOptions,
  type VaultAuditQueryInput,
  type VaultExportSecretInput,
  type VaultReadSecretPlaintextInput,
  type VaultReadAgentPrivateKeyInput,
  type OwnerSensitiveActionConfirmation,
  type OwnerSensitiveActionContext,
  type VaultGrantAgentSecretInput,
  type VaultGrantSecretDestinationInput,
  type VaultRevokeAgentSecretInput,
  type VaultRevokeSecretDestinationInput,
  type VaultListGrantsInput,

  type VaultImportAgentInput,
  type VaultCreateAgentInput,
  type OwnerAgentProvisionResult,
  type OwnerCreateSecretInput,
  type OwnerUpdateSecretInput,
  type OwnerRemoveSecretInput,
  type VaultUpdateAgentInput,
  type VaultListAgentsInput,
  type VaultListRequestsInput,
  type VaultGetRequestInput,
  type VaultListSecretsInput,
  type VaultIssueSessionTokenInput,
  type VaultRevokeSessionTokenInput,
  type VaultApproveDispatchInput,
} from "../clients/owner/index.js";

export {
  createAgentClient,
  type AgentClient,
  type CreateAgentClientOptions,
  type AgentIdentity,
  type AgentDispatchIntent,
  type AgentDispatchTransport,
  type AgentSigner,
} from "../clients/agent/index.js";

export {
  createVaultService,
  type VaultService,
} from "../vault-ingress/index.js";

export {
  handleVaultHttpDispatch,
  handleVaultAgentControlHttp,
  handleVaultAuditSse,
  handleVaultPendingDispatchSse,
} from "../vault-ingress/server-utils.js";

export { AgentDispatchHttpTransport } from "../vault-ingress/remote-transport.js";
export { LocalVaultTransport } from "../vault-ingress/defaults.js";

/**
 * Main runtime interface.
 */
export interface CbioRuntime {
  IdentityError: typeof import("../errors.js").IdentityError;
  IdentityErrorCode: typeof import("../errors.js").IdentityErrorCode;
  OwnerClientError: typeof import("../errors.js").OwnerClientError;
  OwnerClientErrorCode: typeof import("../errors.js").OwnerClientErrorCode;
  VaultCoreError: typeof import("../vault-core/index.js").VaultCoreError;
  FsStorageProvider: typeof import("../storage/fs.js").FsStorageProvider;
  MemoryStorageProvider: typeof import("../storage/memory.js").MemoryStorageProvider;
  LocalSigner: typeof import("../protocol/crypto.js").LocalSigner;
  SystemClock: typeof import("../vault-core/index.js").SystemClock;
  createIdentity: typeof import("./identity.js").createIdentity;
  restoreIdentity: typeof import("./identity.js").restoreIdentity;
  listVaults: typeof import("./bootstrap.js").listVaults;
  createVault: typeof import("./bootstrap.js").createVault;
  recoverVault: typeof import("./bootstrap.js").recoverVault;
  openOwnerSession: typeof import("./owner-session.js").openOwnerSession;
  deriveVaultWorkingKeyFromPassword: typeof import("../protocol/crypto.js").deriveVaultWorkingKeyFromPassword;
  createOwnerClient: typeof import("../clients/owner/index.js").createOwnerClient;
  createAgentClient: typeof import("../clients/agent/index.js").createAgentClient;
  createVaultCore: typeof import("../vault-core/index.js").createVaultCore;
  createVaultCoreDependencies: typeof import("../vault-core/index.js").createVaultCoreDependencies;
  createVaultService: typeof import("../vault-ingress/index.js").createVaultService;
  LocalVaultTransport: typeof import("../vault-ingress/defaults.js").LocalVaultTransport;
  AgentDispatchHttpTransport: typeof import("../vault-ingress/remote-transport.js").AgentDispatchHttpTransport;
  handleVaultHttpDispatch: typeof import("../vault-ingress/server-utils.js").handleVaultHttpDispatch;
  handleVaultAgentControlHttp: typeof import("../vault-ingress/server-utils.js").handleVaultAgentControlHttp;
  handleVaultAuditSse: typeof import("../vault-ingress/server-utils.js").handleVaultAuditSse;
  handleVaultPendingDispatchSse: typeof import("../vault-ingress/server-utils.js").handleVaultPendingDispatchSse;
}

/**
 * Common export for runtime module.
 */
export type CbioRuntimeModule = CbioRuntime;
