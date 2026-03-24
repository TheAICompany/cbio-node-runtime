export { createVaultClient } from "./client.js";

export type {
  VaultClient,
  CreateVaultClientOptions,
  VaultIdentity,
  VaultSigner,
} from "./client.js";

export type {
  VaultAuditQueryInput,
  OwnerDefineSecretTargetsInput,
  VaultExportSecretInput,
  VaultGrantCapabilityInput,
  VaultRegisterFlowInput,
  VaultRegisterAgentInput,
  OwnerSecretTargetBinding,
  OwnerStoreSecretInput,
  OwnerWriteSecretInput,
  VaultDeleteSecretInput,
  VaultListAgentsInput,
  VaultListCapabilitiesInput,
  VaultRevokeCapabilityInput,
} from "./contracts.js";
