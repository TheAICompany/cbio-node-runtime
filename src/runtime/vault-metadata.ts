import { Buffer } from "node:buffer";
import type { IStorageProvider } from "../storage/provider.js";
import { SealedJsonRepository } from "../sealed/index.js";

export interface VaultProfile {
  sealed: Record<string, any>; // Encrypted metadata
  public: Record<string, any>; // Plaintext metadata for discovery
}

const VAULT_SEALED_PROFILE_KEY = "vault/sealed/profile.sealed";
export const VAULT_PUBLIC_PROFILE_KEY = "vault/public/profile.json";
 
/** 
 * Reads only the public (plaintext) metadata of a vault. No key required.
 */
export async function readVaultPublicMetadata(
  storage: IStorageProvider,
): Promise<Record<string, any>> {
  const publicRaw = await storage.read(VAULT_PUBLIC_PROFILE_KEY);
  return publicRaw ? JSON.parse(publicRaw.toString("utf8")) : {};
}

export async function writeVaultProfile(
  storage: IStorageProvider,
  profile: VaultProfile,
  vaultWorkingKey: string,
): Promise<void> {
  // 1. Write Sealed Profile
  const repo = new SealedJsonRepository<Record<string, any>>(storage, VAULT_SEALED_PROFILE_KEY, vaultWorkingKey);
  await repo.write(profile.sealed, "vault_profile_sealed");

  // 2. Write Public Profile
  if (profile.public && Object.keys(profile.public).length > 0) {
    await storage.write(VAULT_PUBLIC_PROFILE_KEY, Buffer.from(JSON.stringify(profile.public, null, 2), "utf8"));
  } else {
    if (await storage.has(VAULT_PUBLIC_PROFILE_KEY)) {
      await storage.delete(VAULT_PUBLIC_PROFILE_KEY);
    }
  }
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

  const publicRaw = await storage.read(VAULT_PUBLIC_PROFILE_KEY);
  const publicData = publicRaw ? JSON.parse(publicRaw.toString("utf8")) : {};

  return {
    sealed,
    public: publicData,
  };
}
