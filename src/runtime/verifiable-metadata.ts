import { signPayload, verifySignature } from "../protocol/crypto.js";
import type { IStorageProvider } from "../storage/provider.js";

/**
 * A verifiable envelope for public metadata.
 * Proves that the data was signed by the rightful owner.
 */
export interface VerifiableMetadata<T> {
  payload: T;
  signature: string;
  signer: string; // Public key of the signer
}

/**
 * Signs and writes a payload to storage as a verifiable metadata envelope.
 */
export async function writeVerifiableMetadata<T>(
  storage: IStorageProvider,
  path: string,
  payload: T,
  privateKey: string,
): Promise<void> {
  const payloadStr = JSON.stringify(payload);
  const signature = await signPayload(privateKey, payloadStr);
  const signer = await import("../protocol/crypto.js").then(m => m.derivePublicKey(privateKey));

  const envelope: VerifiableMetadata<T> = {
    payload,
    signature,
    signer,
  };

  await storage.write(path, Buffer.from(JSON.stringify(envelope, null, 2)));
}

/**
 * Reads and optionally verifies a verifiable metadata envelope from storage.
 */
export async function readVerifiableMetadata<T>(
  storage: IStorageProvider,
  path: string,
  expectedSigner?: string,
): Promise<T | null> {
  const raw = await storage.read(path);
  if (!raw) return null;

  try {
    const envelope = JSON.parse(raw.toString()) as VerifiableMetadata<T>;
    
    // If expectedSigner is provided, we MUST verify
    if (expectedSigner && envelope.signer !== expectedSigner) {
      return null; // Signer mismatch
    }

    const payloadStr = JSON.stringify(envelope.payload);
    const isValid = await verifySignature(envelope.signer, payloadStr, envelope.signature);
    
    if (!isValid) {
      console.warn(`[VerifiableMetadata] Invalid signature at ${path}`);
      return null;
    }

    return envelope.payload;
  } catch (e) {
    return null;
  }
}
