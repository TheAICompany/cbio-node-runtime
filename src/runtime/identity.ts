import { derivePublicKey, generateIdentityKeys } from "../protocol/crypto.js";
import { deriveRootAgentId } from "../protocol/identity.js";

export interface CreatedIdentity {
  identityId: string;
  nickname?: string;
  publicKey: string;
  privateKey: string;
}

export interface CreateIdentityOptions {
  nickname?: string;
}

export interface RestoreIdentityOptions {
  nickname?: string;
}

export function createIdentity(options: CreateIdentityOptions = {}): CreatedIdentity {
  const keyPair = generateIdentityKeys();
  if (!keyPair.publicKey || !keyPair.privateKey) {
    throw new Error("identity generation failed");
  }
  const nickname = options.nickname?.trim() ? options.nickname.trim() : undefined;
  return {
    identityId: deriveRootAgentId(keyPair.publicKey),
    nickname,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

export function restoreIdentity(privateKey: string, options: RestoreIdentityOptions = {}): CreatedIdentity {
  const normalizedPrivateKey = privateKey.trim();
  if (!normalizedPrivateKey) {
    throw new Error("private key is required");
  }
  const publicKey = derivePublicKey(normalizedPrivateKey);
  const nickname = options.nickname?.trim() ? options.nickname.trim() : undefined;
  return {
    identityId: deriveRootAgentId(publicKey),
    nickname,
    publicKey,
    privateKey: normalizedPrivateKey,
  };
}
