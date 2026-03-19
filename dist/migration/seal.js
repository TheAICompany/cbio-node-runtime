/**
 * Migration seal/unseal primitives. Single source of truth for sealed blob format.
 * Used by vault and by Cloud for custody transfer. Do not depend on runtime.
 */
import { Buffer } from 'node:buffer';
import * as crypto from 'node:crypto';
import { IdentityError, IdentityErrorCode } from '../errors.js';
export const SEALED_BLOB_VERSION = 'v2.0';
/**
 * Seal secrets with external key (AES-256-GCM). For custody transfer.
 * kdk: 32 bytes, base64url-encoded.
 */
export function sealBlob(payload, kdk) {
    const key = Buffer.from(kdk, 'base64url');
    if (key.length !== 32) {
        throw new IdentityError(IdentityErrorCode.INVALID_KDK, 'seal: kdk must be 32 bytes (base64url decoded)');
    }
    const plainText = JSON.stringify(payload);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}
/**
 * Unseal blob encrypted with kdk. Returns payload for custody import.
 */
export function unsealBlob(sealedBlob, kdk) {
    const key = Buffer.from(kdk, 'base64url');
    if (key.length !== 32) {
        throw new IdentityError(IdentityErrorCode.INVALID_KDK, 'unseal: kdk must be 32 bytes (base64url decoded)');
    }
    const bundle = Buffer.from(sealedBlob, 'base64url');
    const iv = bundle.subarray(0, 12);
    const tag = bundle.subarray(12, 28);
    const encrypted = bundle.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plainText = decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
    const data = JSON.parse(plainText);
    return {
        version: data.version ?? 'v2.0',
        secrets: data.secrets || {},
        secretMetadata: data.secretMetadata,
    };
}
//# sourceMappingURL=seal.js.map