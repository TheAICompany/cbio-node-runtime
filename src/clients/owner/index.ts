export { createVaultClient } from "./client.js";

export type {
  VaultClient,
  VaultIdentity,
  VaultSigner,
} from "./client.js";

export type {
  VaultAuditQueryInput,
  VaultExportSecretInput,
  VaultGrantCapabilityInput,
  VaultRegisterFlowInput,
  VaultRegisterAgentInput,
  OwnerSecretTargetBinding,
  OwnerWriteSecretInput,
} from "./contracts.js";
