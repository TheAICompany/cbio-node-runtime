/**
 * Structured error hierarchy for local vault and identity operations.
 */

export enum IdentityErrorCode {
    VAULT_PERSISTENCE_FAILED = "VAULT_PERSISTENCE_FAILED",
    SECRET_NOT_FOUND = "SECRET_NOT_FOUND",
    ISSUED_IDENTITY_INVALID = "ISSUED_IDENTITY_INVALID",
    VAULT_WRITE_INTEGRITY_FAILED = "VAULT_WRITE_INTEGRITY_FAILED",
    INVALID_KDK = "INVALID_KDK",
    VAULT_CORRUPTED = "VAULT_CORRUPTED",
    VAULT_DECRYPT_FAILED = "VAULT_DECRYPT_FAILED",
    MERGE_IDENTITY_MISMATCH = "MERGE_IDENTITY_MISMATCH",
    SIGNER_REQUIRES_PUBLIC_KEY = "SIGNER_REQUIRES_PUBLIC_KEY",
    SIGNER_REQUIRES_PRIVATE_KEY = "SIGNER_REQUIRES_PRIVATE_KEY",
    EXPORT_REQUIRES_LOCAL_SIGNER = "EXPORT_REQUIRES_LOCAL_SIGNER",
    CHILD_IDENTITY_REQUIRES_PRIVATE_KEY = "CHILD_IDENTITY_REQUIRES_PRIVATE_KEY",
    SECRET_ALREADY_EXISTS = "SECRET_ALREADY_EXISTS",
    VAULT_FILE_NOT_FOUND = "VAULT_FILE_NOT_FOUND",
    SECRET_POLICY_REQUIRED = "SECRET_POLICY_REQUIRED",
    SECRET_SOURCE_ORIGIN_MISMATCH = "SECRET_SOURCE_ORIGIN_MISMATCH",
    UNSUPPORTED_SIGNED_BODY = "UNSUPPORTED_SIGNED_BODY",
    PERMISSION_DENIED = "PERMISSION_DENIED",
}

export class IdentityError extends Error {
    readonly code: IdentityErrorCode;

    constructor(code: IdentityErrorCode, message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "IdentityError";
        this.code = code;
        Object.setPrototypeOf(this, IdentityError.prototype);
    }

    static isIdentityError(e: unknown): e is IdentityError {
        return e instanceof IdentityError;
    }
}
