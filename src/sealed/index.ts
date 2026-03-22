/**
 * Sealed blob export. Seal/unseal primitives and sealed blob format helpers.
 * Do not depend on agent-facing client code.
 */

export { sealBlob, unsealBlob, SEALED_BLOB_VERSION } from './seal.js';
export type { SealedBlobPayload } from './seal.js';
export { SealedJsonRepository } from './json-repo.js';
