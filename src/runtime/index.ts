/**
 * Runtime export.
 * Public surface: high-level runtime and client APIs only.
 */

export { IdentityError, IdentityErrorCode } from "../errors.js";
export type { IStorageProvider } from "../storage/provider.js";
export { FsStorageProvider } from "../storage/fs.js";
export {
  createIdentity,
  deriveChildIdentity,
  restoreIdentity,
  type CreateIdentityOptions,
  type RestoreIdentityOptions,
  type CreatedIdentity,
} from "./identity.js";
export {
  createChildIdentity,
  type CreateChildIdentityOptions,
} from "./child-identity.js";
export {
  createWorkspaceStorage,
  getDefaultWorkspaceDir,
} from "./workspace-storage.js";
export {
  ensurePrivateVault,
} from "./private-vault.js";
export {
  createVault,
  recoverVault,
  type CreateVaultOptions,
  type CreatedVault,
  type RecoverVaultOptions,
  type RecoveredVault,
} from "./bootstrap.js";

export { VaultCoreError, type AgentCapability, type SecretRecord } from "../vault-core/index.js";

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
  createOwnerHttpFlowBoundary,
  createStandardAcquireBoundary,
  createStandardDispatchBoundary,
  type OwnerHttpFlowBoundary,
} from "../vault-ingress/index.js";
