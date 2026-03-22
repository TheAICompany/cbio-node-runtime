/**
 * Runtime export.
 * Public surface: typed high-level runtime plus supported low-level building blocks.
 */

export { IdentityError, IdentityErrorCode } from "../errors.js";
export { derivePublicKey, LocalSigner } from "../protocol/crypto.js";
export { deriveIdentityId } from "../protocol/identity.js";
export type { IStorageProvider } from "../storage/provider.js";
export { FsStorageProvider } from "../storage/fs.js";
export { MemoryStorageProvider } from "../storage/memory.js";
export {
  createIdentity,
  deriveChildIdentity,
  restoreIdentity,
  type CreateIdentityOptions,
  type RestoreIdentityOptions,
  type ChildIdentity,
  type CreatedIdentity,
} from "./identity.js";
export {
  createChildIdentity,
  type CreateChildIdentityOptions,
} from "./child-identity.js";
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
  ensureIdentityPrivateVault,
  readIdentityPrivateVaultProfile,
  readIdentityPrivateVaultChildrenState,
  identityPrivateVaultPrefix,
  identityPrivateVaultProfileKey,
  identityPrivateVaultChildrenKey,
  type IdentityPrivateVaultProfile,
  type IdentityPrivateVaultChildRecord,
  type IdentityPrivateVaultChildrenState,
} from "./private-vault.js";
export {
  createVault,
  recoverVault,
  type CreateVaultOptions,
  type CreatedVault,
  type RecoverVaultOptions,
  type RecoveredVault,
  type VaultObject,
} from "./bootstrap.js";

export {
  createVaultCore,
  DefaultVaultCore,
  VaultCoreError,
  createDefaultVaultCoreDependencies,
  type CreateDefaultVaultCoreDependenciesOptions,
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
  PersistentVaultOwnerIdentityRegistry,
  PersistentVaultCapabilityRegistry,
  PersistentVaultCapabilityRevocationRegistry,
  PersistentVaultCustomHttpFlowRegistry,
  PersistentVaultRateLimitStore,
  PersistentVaultReplayGuard,
  PersistentVaultSecretCustody,
  PersistentVaultSecretRepository,
  HttpDispatchExecutor,
  InMemoryAgentIdentityRegistry,
  InMemoryCapabilityRegistry,
  InMemoryCapabilityRevocationRegistry,
  InMemoryCustomHttpFlowRegistry,
  InMemoryRateLimitStore,
  InMemoryReplayGuard,
  InMemoryAuditLog,
  InMemoryOwnerIdentityRegistry,
  InMemorySecretCustody,
  InMemorySecretRepository,
  RandomIdGenerator,
  SignatureOwnerProofVerifier,
  type SignatureAgentProofVerifierOptions,
  SignatureAgentProofVerifier,
  SystemClock,
  type AgentCapability,
  type AgentIdentityRecord,
  type AgentProof,
  type OwnerAuditRequest,
  type OwnerExportSecretRequest,
  type OwnerDefineSecretTargetsCommand,
  type OwnerRegisterCapabilityCommand,
  type OwnerRegisterAgentIdentityCommand,
  type OwnerRegisterCustomHttpFlowCommand,
  type OwnerSecretExport,
  type OwnerIdentityRecord,
  type CustomHttpFlowDefinition,
  type OwnerProof,
  type AuditEntry,
  type AuditLog,
  type AuditQuery,
  type Clock,
  type DispatchAuthorization,
  type DispatchInstruction,
  type DispatchRequest,
  type DispatchResult,
  type IdGenerator,
  type OwnerIdentityRegistry,
  type OwnerProofVerifier,
  type PolicyEngine,
  type RateLimitStore,
  type ReplayGuard,
  type CustomHttpFlowRegistry,
  type SecretAlias,
  type SecretCustody,
  type SecretId,
  type SecretRecord,
  type SecretRepository,
  type SecretVersion,
  type TrustedExecutor,
  type VaultCore,
  type VaultCoreDependencies,
  type VaultPrincipal,
  type VaultPrincipalKind,
  type VaultTargetBinding,
  type VaultWriteSecretCommand,
  type VaultId,
  type AgentIdentityRegistry,
  type AgentProofVerifier,
  type CapabilityRevocationRegistry,
  type CapabilityRegistry,
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
  type OwnerSecretTargetBinding,
  type OwnerStoreSecretInput,
  type OwnerWriteSecretInput,
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
  toOwnerHttpFlowBoundary,
  type VaultService,
  type VaultAcquireSecretInput,
  type VaultAcquireSecretResult,
  type VaultAcquireSecretFlow,
  type VaultCustomFlowResolver,
  type VaultAgentDispatchRequest,
  type VaultAgentDispatchResponse,
  type VaultAgentDispatchErrorResponse,
  type RedactedResponseShape,
  type OwnerHttpFlowBoundary,
} from "../vault-ingress/index.js";

export { LocalVaultTransport } from "../vault-ingress/defaults.js";

export type Identity = import("./identity.js").CreatedIdentity;
export type VaultMetadata = import("./vault-metadata.js").VaultProfile;

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
  createChildIdentity: typeof import("./child-identity.js").createChildIdentity;
  deriveChildIdentity: typeof import("./identity.js").deriveChildIdentity;
  ensureIdentityPrivateVault: typeof import("./private-vault.js").ensureIdentityPrivateVault;
  readIdentityPrivateVaultProfile: typeof import("./private-vault.js").readIdentityPrivateVaultProfile;
  readIdentityPrivateVaultChildrenState: typeof import("./private-vault.js").readIdentityPrivateVaultChildrenState;
  createVault: typeof import("./bootstrap.js").createVault;
  recoverVault: typeof import("./bootstrap.js").recoverVault;
  createVaultClient: typeof import("../clients/owner/index.js").createVaultClient;
  createAgentClient: typeof import("../clients/agent/index.js").createAgentClient;
  createVaultCore: typeof import("../vault-core/index.js").createVaultCore;
  createDefaultVaultCoreDependencies: typeof import("../vault-core/index.js").createDefaultVaultCoreDependencies;
  createPersistentVaultCoreDependencies: typeof import("../vault-core/index.js").createPersistentVaultCoreDependencies;
  initializeVaultCustody: typeof import("../vault-core/index.js").initializeVaultCustody;
  recoverVaultWorkingKey: typeof import("../vault-core/index.js").recoverVaultWorkingKey;
  createVaultService: typeof import("../vault-ingress/index.js").createVaultService;
  wrapVaultCoreAsVaultService: typeof import("../vault-ingress/index.js").wrapVaultCoreAsVaultService;
  createOwnerHttpFlowBoundary: typeof import("../vault-ingress/index.js").createOwnerHttpFlowBoundary;
  createStandardAcquireBoundary: typeof import("../vault-ingress/index.js").createStandardAcquireBoundary;
  createStandardDispatchBoundary: typeof import("../vault-ingress/index.js").createStandardDispatchBoundary;
  LocalVaultTransport: typeof import("../vault-ingress/defaults.js").LocalVaultTransport;
}
