import { createHmac, createPrivateKey, createPublicKey } from "node:crypto";
import { derivePublicKey, generateIdentityKeys } from "../protocol/crypto.js";
import { deriveIdentityId } from "../protocol/identity.js";

/**
 * Represents a newly created or restored identity.
 * @internal This is the core identity shape used across the runtime.
 */
export interface CreatedIdentity {
  /** The unique identifier for this identity (derived from public key). */
  identityId: string;
  /** A human-readable label (local only, not part of the crypto identity). */
  nickname?: string;
  /** The base64url-encoded public key. */
  publicKey: string;
  /** The base64url-encoded Ed25519 PKCS#8 private key. */
  privateKey: string;
}

export interface CreateIdentityOptions {
  nickname?: string;
}

export interface RestoreIdentityOptions {
  nickname?: string;
}

export interface DeriveIdentityOptions {
  nickname?: string;
}

const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const ED25519_SEED_LENGTH = 32;

function normalizeNickname(nickname?: string): string | undefined {
  return nickname?.trim() ? nickname.trim() : undefined;
}

function decodeEd25519Seed(privateKey: string): Buffer {
  const der = Buffer.from(privateKey, "base64url");
  if (
    der.length !== ED25519_PKCS8_PREFIX.length + ED25519_SEED_LENGTH ||
    !der.subarray(0, ED25519_PKCS8_PREFIX.length).equals(ED25519_PKCS8_PREFIX)
  ) {
    throw new Error("unsupported private key format");
  }
  return der.subarray(ED25519_PKCS8_PREFIX.length);
}

function encodeEd25519PrivateKey(seed: Buffer): string {
  return Buffer.concat([ED25519_PKCS8_PREFIX, seed]).toString("base64url");
}

function createRootIdentity(options: CreateIdentityOptions = {}): CreatedIdentity {
  const keyPair = generateIdentityKeys();
  if (!keyPair.publicKey || !keyPair.privateKey) {
    throw new Error("identity generation failed");
  }
  const nickname = normalizeNickname(options.nickname);
  return {
    identityId: deriveIdentityId(keyPair.publicKey),
    nickname,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Creates a new identity with a fresh Ed25519 keypair.
 *
 * @param options - Configuration for the new identity.
 * @returns A {@link CreatedIdentity} containing the ID and keys.
 *
 * @example
 * ```ts
 * const identity = createIdentity({ nickname: 'my-agent' });
 * console.log(identity.identityId);
 * ```
 */
export function createIdentity(options?: CreateIdentityOptions): CreatedIdentity;
export function createIdentity(
  optionsOrParams?: CreateIdentityOptions,
): CreatedIdentity {
  return createRootIdentity(optionsOrParams ?? {});
}

/**
 * Restores an identity from an existing private key.
 *
 * @param privateKey - The base64url-encoded PKCS#8 private key.
 * @param options - Optional metadata to attach to the restored object.
 * @returns The reconstructed {@link CreatedIdentity}.
 *
 * @example
 * ```ts
 * const identity = restoreIdentity('MIIB...');
 * ```
 */
export function restoreIdentity(privateKey: string, options: RestoreIdentityOptions = {}): CreatedIdentity {
  const normalizedPrivateKey = privateKey.trim();
  if (!normalizedPrivateKey) {
    throw new Error("private key is required");
  }
  const publicKey = derivePublicKey(normalizedPrivateKey);
  const nickname = normalizeNickname(options.nickname);
  return {
    identityId: deriveIdentityId(publicKey),
    nickname,
    publicKey,
    privateKey: normalizedPrivateKey,
  };
}
