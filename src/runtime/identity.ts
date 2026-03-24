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
  /** The identity ID of the parent, if this is a child identity. */
  parentIdentityId?: string;
  /** The derivation index, if this is a child identity. */
  childIndex?: number;
  /** The base64url-encoded public key. */
  publicKey: string;
  /** The base64url-encoded Ed25519 PKCS#8 private key. */
  privateKey: string;
}

export interface ChildIdentity extends CreatedIdentity {
  parentIdentityId: string;
  childIndex: number;
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

function toParentPrivateKey(parent?: CreatedIdentity | string): string | undefined {
  if (!parent) {
    return undefined;
  }
  return typeof parent === "string" ? parent.trim() : parent.privateKey.trim();
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
 * Creates a new root identity with a fresh Ed25519 keypair.
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
  parentOrOptions?: CreatedIdentity | string | CreateIdentityOptions,
  childIndexOrOptions?: number | CreateIdentityOptions,
  maybeOptions: CreateIdentityOptions = {},
): CreatedIdentity {
  const hasParent =
    typeof parentOrOptions === "string" ||
    (typeof parentOrOptions === "object" &&
      parentOrOptions !== null &&
      "privateKey" in parentOrOptions);

  if (hasParent) {
    throw new Error("createIdentity() only creates root identities; use createChildIdentity() or deriveChildIdentity()");
  }
  return createRootIdentity((parentOrOptions as CreateIdentityOptions | undefined) ?? {});
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

function deriveIdentity(
  parentPrivateKey: string,
  childIndex: number,
  options: DeriveIdentityOptions = {},
): CreatedIdentity {
  const normalizedParentPrivateKey = parentPrivateKey.trim();
  if (!normalizedParentPrivateKey) {
    throw new Error("parent private key is required");
  }
  if (!Number.isInteger(childIndex) || childIndex < 0) {
    throw new Error("childIndex must be a non-negative integer");
  }

  const parentSeed = decodeEd25519Seed(normalizedParentPrivateKey);
  const childSeed = createHmac("sha256", parentSeed)
    .update("cbio:identity:child:v1")
    .update("\0")
    .update(String(childIndex))
    .digest();

  const privateKey = encodeEd25519PrivateKey(childSeed);
  const privateKeyObject = createPrivateKey({
    key: Buffer.from(privateKey, "base64url"),
    format: "der",
    type: "pkcs8",
  });
  const publicKey = Buffer.from(
    createPublicKey(privateKeyObject).export({
      type: "spki",
      format: "der",
    }),
  ).toString("base64url");

  return {
    identityId: deriveIdentityId(publicKey),
    nickname: normalizeNickname(options.nickname),
    publicKey,
    privateKey,
  };
}

/**
 * Deterministically derives a child identity from a parent's private key and an index.
 *
 * @param parent - The parent identity object or its private key string.
 * @param childIndex - A non-negative integer for derivation.
 * @param options - Optional nickname for the child.
 * @returns A {@link ChildIdentity} with derivation metadata.
 *
 * @example
 * ```ts
 * const child = deriveChildIdentity(parentIdentity, 0, { nickname: 'sub-agent-0' });
 * ```
 */
export function deriveChildIdentity(
  parent: CreatedIdentity | string,
  childIndex: number,
  options: DeriveIdentityOptions = {},
): ChildIdentity {
  const parentPrivateKey = toParentPrivateKey(parent);
  if (!parentPrivateKey) {
    throw new Error("parent private key is required");
  }
  const parentIdentity = typeof parent === "string"
    ? restoreIdentity(parentPrivateKey)
    : parent;
  return {
    ...deriveIdentity(parentPrivateKey, childIndex, options),
    parentIdentityId: parentIdentity.identityId,
    childIndex,
  };
}
