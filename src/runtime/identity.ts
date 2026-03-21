import { generateIdentityKeys } from "../protocol/crypto.js";
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
