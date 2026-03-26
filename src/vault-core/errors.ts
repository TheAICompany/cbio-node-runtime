export class VaultCoreError extends Error {
  constructor(
    message: string,
    readonly code:
      | "VAULT_SECRET_NOT_FOUND"
      | "VAULT_WRITE_DENIED"
      | "VAULT_READ_DENIED"
      | "VAULT_IDENTITY_DENIED"
      | "VAULT_DISPATCH_DENIED"
      | "VAULT_AUDIT_DENIED"
      | "VAULT_AUDIT_FAILED"
      | "VAULT_REQUEST_NOT_FOUND"
      | "VAULT_AGENT_NOT_FOUND"
      | "VAULT_CAPABILITY_NOT_FOUND",
  ) {
    super(message);
    this.name = "VaultCoreError";
  }
}
