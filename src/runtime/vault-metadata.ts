import { Buffer } from "node:buffer";
import type { IStorageProvider } from "../storage/provider.js";
import { SealedJsonRepository } from "../sealed/index.js";

export interface VaultProfile {
  sealed: Record<string, any>; // Encrypted metadata (Internal/Secret)
  public: Record<string, any> & { nickname?: string }; // Plaintext metadata for discovery
}

const VAULT_SEALED_PROFILE_KEY = "vault/sealed/profile.sealed";
export const VAULT_PUBLIC_PROFILE_KEY = "vault/public/profile.json";

import { readVerifiableMetadata } from "./verifiable-metadata.js";

/** 
 * Reads only the public (plaintext) metadata of a vault. No key required.
 */
export async function readVaultPublicMetadata(
  storage: IStorageProvider,
): Promise<Record<string, any>> {
  const data = await readVerifiableMetadata<Record<string, any>>(storage, VAULT_PUBLIC_PROFILE_KEY).catch(() => null);
  return data || {};
}

export async function writeVaultProfile(
  storage: IStorageProvider,
  profile: VaultProfile,
  vaultWorkingKey: string,
): Promise<void> {
  // 1. Write Sealed Profile
  const repo = new SealedJsonRepository<Record<string, any>>(storage, VAULT_SEALED_PROFILE_KEY, vaultWorkingKey);
  await repo.write(profile.sealed, "vault_profile_sealed");

  // NOTE: Public profile writing is handled separately via writeVerifiableMetadata
  // by the component that holds the owner's private key (e.g., bootstrap.ts).
}

export async function readVaultProfile(
  storage: IStorageProvider,
  vaultWorkingKey: string,
): Promise<VaultProfile | null> {
  const repo = new SealedJsonRepository<Record<string, any>>(storage, VAULT_SEALED_PROFILE_KEY, vaultWorkingKey);
  const sealed = await repo.read(null as any);
  if (!sealed) {
    return null;
  }

  const publicData = await readVaultPublicMetadata(storage);

  return {
    sealed,
    public: publicData,
  };
}
