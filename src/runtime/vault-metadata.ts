import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import type { IStorageProvider } from "../storage/provider.js";
import { SealedJsonRepository } from "../sealed/index.js";

export interface VaultProfile {
  sealedPublic: Record<string, any> & { nickname?: string }; // Encrypted with Public-Derivable Key
  sealedPrivate: Record<string, any>; // Encrypted with Owner's Private Key
}

const VAULT_SEALED_PROFILE_KEY = "vault/sealed/profile.sealed";
const VAULT_PUBLIC_SEALED_PROFILE_KEY = "vault/sealed/public.sealed";

/**
 * Derives a key that is publicly available to anyone who knows the vaultId.
 * Used to encrypt 'public' metadata to prevent JSON tampering on disk.
 */
export function deriveVaultPublicWorkingKey(vaultId: string): string {
  return createHash("sha256")
    .update("cbio:vault-public-metadata:v1")
    .update("\n")
    .update(vaultId)
    .digest("base64url");
}

/** 
 * Reads the 'public' metadata of a vault. Requires vaultId but no private key.
 */
export async function readVaultPublicMetadata(
  storage: IStorageProvider,
  vaultId: string,
): Promise<Record<string, any>> {
  const publicWorkingKey = deriveVaultPublicWorkingKey(vaultId);
  const repo = new SealedJsonRepository<Record<string, any>>(storage, VAULT_PUBLIC_SEALED_PROFILE_KEY, publicWorkingKey);
  const data = await repo.read(null as any).catch(() => null);
  return data || {};
}

export async function writeVaultProfile(
  storage: IStorageProvider,
  profile: VaultProfile,
  vaultWorkingKey: string,
  vaultId: string,
): Promise<void> {
  // 1. Write Private Sealed Profile
  const privateRepo = new SealedJsonRepository<Record<string, any>>(storage, VAULT_SEALED_PROFILE_KEY, vaultWorkingKey);
  await privateRepo.write(profile.sealedPrivate, "vault_profile_private");

  // 2. Write Public Sealed Profile (encrypted for format protection, but publicly-read via side-channel)
  const publicWorkingKey = deriveVaultPublicWorkingKey(vaultId);
  const publicRepo = new SealedJsonRepository<Record<string, any>>(storage, VAULT_PUBLIC_SEALED_PROFILE_KEY, publicWorkingKey);
  await publicRepo.write(profile.sealedPublic, "vault_profile_public");
}

export async function readVaultProfile(
  storage: IStorageProvider,
  vaultWorkingKey: string,
  vaultId: string,
): Promise<VaultProfile | null> {
  const privateRepo = new SealedJsonRepository<Record<string, any>>(storage, VAULT_SEALED_PROFILE_KEY, vaultWorkingKey);
  const sealedPrivate = await privateRepo.read(null as any);
  if (!sealedPrivate) {
    return null;
  }

  const sealedPublic = await readVaultPublicMetadata(storage, vaultId);

  return {
    sealedPublic,
    sealedPrivate,
  };
}
