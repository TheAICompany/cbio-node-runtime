import { generateIdentityKeys } from "../protocol/crypto.js";
import { deriveRootAgentId } from "../protocol/identity.js";

export interface CreatedIdentity {
  identityId: string;
  publicKey: string;
  privateKey: string;
}

export function createIdentity(): CreatedIdentity {
  const keyPair = generateIdentityKeys();
  if (!keyPair.publicKey || !keyPair.privateKey) {
    throw new Error("identity generation failed");
  }
  return {
    identityId: deriveRootAgentId(keyPair.publicKey),
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}
