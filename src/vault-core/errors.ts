export class VaultCoreError extends Error {
  constructor(
    message: string,
    readonly code:
      | "VAULT_SECRET_NOT_FOUND"
      | "VAULT_WRITE_DENIED"
      | "VAULT_IDENTITY_DENIED"
      | "VAULT_DISPATCH_DENIED"
      | "VAULT_AUDIT_DENIED"
      | "VAULT_AUDIT_FAILED",
  ) {
    super(message);
    this.name = "VaultCoreError";
  }
}
