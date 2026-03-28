export type VaultCoreErrorCode =
  | "VAULT_SECRET_NOT_FOUND"
  | "VAULT_ALIAS_ALREADY_EXISTS"
  | "VAULT_WRITE_DENIED"
  | "VAULT_READ_DENIED"
  | "VAULT_IDENTITY_DENIED"
  | "VAULT_IDENTITY_NOT_FOUND"
  | "VAULT_DISPATCH_DENIED"
  | "VAULT_AUDIT_DENIED"
  | "VAULT_AUDIT_FAILED"
  | "VAULT_REQUEST_NOT_FOUND"
  | "VAULT_REQUEST_NOT_PENDING"
  | "VAULT_AGENT_NOT_FOUND"
  | "VAULT_ACCESS_DENIED"
  | "VAULT_INTERNAL_ERROR";

export class VaultCoreError extends Error {
  constructor(
    message: string,
    readonly code: VaultCoreErrorCode,
  ) {
    super(message);
    this.name = "VaultCoreError";
  }
}
