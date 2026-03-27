export { createVaultClient } from "./client.js";
export { OwnerClientError, OwnerClientErrorCode } from "../../errors.js";

export type {
  VaultClient,
  CreateVaultClientOptions,
  VaultIdentity,
  VaultSigner,
} from "./client.js";

export type {
  VaultAuditQueryInput,
  VaultExportSecretInput,
  VaultReadSecretPlaintextInput,
  VaultReadAgentPrivateKeyInput,
  OwnerSensitiveActionConfirmation,
  OwnerSensitiveActionContext,
  VaultGrantCapabilityInput,
  VaultGrantCapabilityRequest,
  OwnerGrantCapabilityInput,
  VaultRegisterFlowInput,
  VaultImportAgentInput,
  VaultCreateAgentInput,
  OwnerAgentProvisionResult,
  OwnerStoreSecretInput,
  OwnerWriteSecretInput,
  VaultDeleteSecretInput,
  VaultUpdateAgentInput,
  VaultListAgentsInput,
  VaultListCapabilitiesInput,
  VaultListSecretsInput,
  VaultRevokeCapabilityInput,
  VaultIssueSessionTokenInput,
  VaultRevokeSessionTokenInput,
  VaultSubmitCapabilityRequestInput,
  VaultApproveCapabilityRequestInput,
  VaultApproveDispatchInput,
} from "./contracts.js";
