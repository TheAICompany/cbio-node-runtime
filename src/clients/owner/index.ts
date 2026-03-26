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
  VaultReadSecretPlaintextInput,
  VaultReadAgentPrivateKeyInput,
  OwnerSensitiveActionConfirmation,
  OwnerSensitiveActionContext,
  VaultGrantCapabilityInput,
  VaultRegisterFlowInput,
  VaultImportAgentInput,
  VaultCreateAgentInput,
  OwnerAgentProvisionResult,
  OwnerSecretTargetBinding,
  OwnerStoreSecretInput,
  OwnerWriteSecretInput,
  VaultDeleteSecretInput,
  VaultListAgentsInput,
  VaultListCapabilitiesInput,
  VaultListSecretsInput,
  VaultRevokeCapabilityInput,
  VaultIssueSessionTokenInput,
  VaultRevokeSessionTokenInput,
  VaultSubmitCapabilityRequestInput,
  VaultApproveCapabilityRequestInput,
} from "./contracts.js";
