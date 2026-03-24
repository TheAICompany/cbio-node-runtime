/**
 * Runtime export.
 * Main API: typed high-level runtime plus supported low-level building blocks.
 */

export { IdentityError, IdentityErrorCode } from "../errors.js";
export { derivePublicKey, LocalSigner, type Signer, deriveVaultWorkingKeyFromPassword } from "../protocol/crypto.js";
export { deriveIdentityId } from "../protocol/identity.js";
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
  PersistentVaultCapabilityRegistry,
  PersistentVaultCapabilityRevocationRegistry,
  PersistentVaultCustomHttpFlowRegistry,
  PersistentVaultRateLimitStore,
  PersistentVaultReplayGuard,
  PersistentVaultSecretCustody,
  PersistentVaultSecretRepository,
} from "../vault-core/index.js";

export {
  createVaultClient,
  type VaultClient,
  type CreateVaultClientOptions,
  type VaultIdentity,
  type VaultSigner,
  type VaultAuditQueryInput,
  type OwnerDefineSecretTargetsInput,
  type VaultExportSecretInput,
  type VaultGrantCapabilityInput,
  type VaultRegisterFlowInput,
  type VaultRegisterAgentInput,
  type VaultCreateAgentInput,
  type OwnerSecretTargetBinding,
  type OwnerStoreSecretInput,
  type OwnerWriteSecretInput,
  type VaultDeleteSecretInput,
  type VaultListAgentsInput,
  type VaultListCapabilitiesInput,
  type VaultRevokeCapabilityInput,
} from "../clients/owner/index.js";

export {
  createAgentClient,
  type AgentClient,
  type CreateAgentClientOptions,
  type AgentIdentity,
  type AgentCapabilityEnvelope,
  type AgentDispatchIntent,
  type AgentDispatchTransport,
  type AgentSigner,
} from "../clients/agent/index.js";

export {
  createVaultService,
  wrapVaultCoreAsVaultService,
  createOwnerHttpFlowBoundary,
  createStandardAcquireBoundary,
  createStandardDispatchBoundary,
  AgentDispatchHttpTransport,
  handleVaultHttpDispatch,
} from "../vault-ingress/index.js";

export { LocalVaultTransport } from "../vault-ingress/defaults.js";

/**
 * Main runtime interface.
 */
export interface CbioRuntime {
  IdentityError: typeof import("../errors.js").IdentityError;
  IdentityErrorCode: typeof import("../errors.js").IdentityErrorCode;
  VaultCoreError: typeof import("../vault-core/index.js").VaultCoreError;
  FsStorageProvider: typeof import("../storage/fs.js").FsStorageProvider;
  MemoryStorageProvider: typeof import("../storage/memory.js").MemoryStorageProvider;
  LocalSigner: typeof import("../protocol/crypto.js").LocalSigner;
  SystemClock: typeof import("../vault-core/index.js").SystemClock;
  PersistentVaultCapabilityRevocationRegistry: typeof import("../vault-core/index.js").PersistentVaultCapabilityRevocationRegistry;
  createIdentity: typeof import("./identity.js").createIdentity;
  restoreIdentity: typeof import("./identity.js").restoreIdentity;
  listVaults: typeof import("./bootstrap.js").listVaults;
  createVault: typeof import("./bootstrap.js").createVault;
  recoverVault: typeof import("./bootstrap.js").recoverVault;
  deriveVaultWorkingKeyFromPassword: typeof import("../protocol/crypto.js").deriveVaultWorkingKeyFromPassword;
  createVaultClient: typeof import("../clients/owner/index.js").createVaultClient;
  createAgentClient: typeof import("../clients/agent/index.js").createAgentClient;
  createVaultCore: typeof import("../vault-core/index.js").createVaultCore;
  createVaultCoreDependencies: typeof import("../vault-core/index.js").createVaultCoreDependencies;
  createVaultService: typeof import("../vault-ingress/index.js").createVaultService;
  wrapVaultCoreAsVaultService: typeof import("../vault-ingress/index.js").wrapVaultCoreAsVaultService;
  createOwnerHttpFlowBoundary: typeof import("../vault-ingress/index.js").createOwnerHttpFlowBoundary;
  createStandardAcquireBoundary: typeof import("../vault-ingress/index.js").createStandardAcquireBoundary;
  createStandardDispatchBoundary: typeof import("../vault-ingress/index.js").createStandardDispatchBoundary;
  LocalVaultTransport: typeof import("../vault-ingress/defaults.js").LocalVaultTransport;
  AgentDispatchHttpTransport: typeof import("../vault-ingress/remote-transport.js").AgentDispatchHttpTransport;
  handleVaultHttpDispatch: typeof import("../vault-ingress/server-utils.js").handleVaultHttpDispatch;
}

/**
 * Common export for runtime module.
 */
export type CbioRuntimeModule = CbioRuntime;
