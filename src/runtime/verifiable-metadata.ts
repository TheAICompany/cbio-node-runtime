import { signPayload, verifySignature, derivePublicKey } from "../protocol/crypto.js";
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
 * Hardcoded field order for canonical JSON stringification.
 * This ensures that even if different environments parse/stringify, 
 * the signature check string is always identical.
 */
function canonicalStringify(obj: any): string {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return JSON.stringify(obj);
  }

  const keys = Object.keys(obj).sort();
  const parts: string[] = [];

  for (const key of keys) {
    const value = obj[key];
    if (value === undefined) continue;
    
    // Recursive canonical for nested objects if any (mostly for publicMetadata)
    parts.push(`${JSON.stringify(key)}:${canonicalStringify(value)}`);
  }

  return `{${parts.join(",")}}`;
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
  const payloadStr = canonicalStringify(payload);
  const signature = await signPayload(privateKey, payloadStr);
  const signer = derivePublicKey(privateKey);

  // Self-verify check
  const isCorrect = await verifySignature(signer, payloadStr, signature);
  if (!isCorrect) {
    throw new Error(`[VerifiableMetadata] SDK Integrity Failure: Generated signature is invalid for the payload. 
Payload: ${payloadStr}
Signer: ${signer}
Signature: ${signature}`);
  }

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

    const payloadStr = canonicalStringify(envelope.payload);
    const isValid = await verifySignature(envelope.signer, payloadStr, envelope.signature);
    
    if (!isValid) {
      console.warn(`[VerifiableMetadata] Invalid signature at ${path}`);
      console.warn(`[VerifiableMetadata] Signer: ${envelope.signer}`);
      console.warn(`[VerifiableMetadata] Payload String: ${payloadStr}`);
      console.warn(`[VerifiableMetadata] Signature: ${envelope.signature}`);
      return null;
    }

    return envelope.payload;
  } catch (e) {
    return null;
  }
}
