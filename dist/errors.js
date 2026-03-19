/**
 * Structured error hierarchy for local vault and identity operations.
 */
export var IdentityErrorCode;
(function (IdentityErrorCode) {
    IdentityErrorCode["VAULT_PERSISTENCE_FAILED"] = "VAULT_PERSISTENCE_FAILED";
    IdentityErrorCode["SECRET_NOT_FOUND"] = "SECRET_NOT_FOUND";
    IdentityErrorCode["VAULT_WRITE_INTEGRITY_FAILED"] = "VAULT_WRITE_INTEGRITY_FAILED";
    IdentityErrorCode["INVALID_KDK"] = "INVALID_KDK";
    IdentityErrorCode["VAULT_CORRUPTED"] = "VAULT_CORRUPTED";
    IdentityErrorCode["VAULT_DECRYPT_FAILED"] = "VAULT_DECRYPT_FAILED";
    IdentityErrorCode["MERGE_IDENTITY_MISMATCH"] = "MERGE_IDENTITY_MISMATCH";
    IdentityErrorCode["SIGNER_REQUIRES_PUBLIC_KEY"] = "SIGNER_REQUIRES_PUBLIC_KEY";
    IdentityErrorCode["SIGNER_REQUIRES_PRIVATE_KEY"] = "SIGNER_REQUIRES_PRIVATE_KEY";
    IdentityErrorCode["EXPORT_REQUIRES_LOCAL_SIGNER"] = "EXPORT_REQUIRES_LOCAL_SIGNER";
    IdentityErrorCode["CHILD_IDENTITY_REQUIRES_PRIVATE_KEY"] = "CHILD_IDENTITY_REQUIRES_PRIVATE_KEY";
    IdentityErrorCode["SECRET_ALREADY_EXISTS"] = "SECRET_ALREADY_EXISTS";
    IdentityErrorCode["VAULT_FILE_NOT_FOUND"] = "VAULT_FILE_NOT_FOUND";
    IdentityErrorCode["SECRET_POLICY_REQUIRED"] = "SECRET_POLICY_REQUIRED";
    IdentityErrorCode["SECRET_SOURCE_ORIGIN_MISMATCH"] = "SECRET_SOURCE_ORIGIN_MISMATCH";
    IdentityErrorCode["UNSUPPORTED_SIGNED_BODY"] = "UNSUPPORTED_SIGNED_BODY";
    IdentityErrorCode["PERMISSION_DENIED"] = "PERMISSION_DENIED";
})(IdentityErrorCode || (IdentityErrorCode = {}));
export class IdentityError extends Error {
    code;
    constructor(code, message, options) {
        super(message, options);
        this.name = "IdentityError";
        this.code = code;
        Object.setPrototypeOf(this, IdentityError.prototype);
    }
    static isIdentityError(e) {
        return e instanceof IdentityError;
    }
}
//# sourceMappingURL=errors.js.map