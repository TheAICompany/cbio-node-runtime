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
  VaultCreateAgentInput,
  OwnerSecretTargetBinding,
  OwnerStoreSecretInput,
  OwnerWriteSecretInput,
  VaultDeleteSecretInput,
  VaultListAgentsInput,
  VaultListCapabilitiesInput,
  VaultRevokeCapabilityInput,
  VaultSubmitCapabilityRequestInput,
  VaultApproveCapabilityRequestInput,
} from "./contracts.js";
