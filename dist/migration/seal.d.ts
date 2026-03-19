/**
 * Migration seal/unseal primitives. Single source of truth for sealed blob format.
 * Used by vault and by Cloud for custody transfer. Do not depend on runtime.
 */
export declare const SEALED_BLOB_VERSION: "v1.0";
export interface SealedBlobPayload {
    version: string;
    secrets: Record<string, string>;
    secretMetadata?: Record<string, unknown>;
}
/**
 * Seal secrets with external key (AES-256-GCM). For custody transfer.
 * kdk: 32 bytes, base64url-encoded.
 */
export declare function sealBlob(payload: SealedBlobPayload, kdk: string): string;
/**
 * Unseal blob encrypted with kdk. Returns payload for custody import.
 */
export declare function unsealBlob(sealedBlob: string, kdk: string): SealedBlobPayload;
