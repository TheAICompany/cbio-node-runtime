import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import type { IStorageProvider } from "../storage/provider.js";
import { SealedJsonRepository } from "../sealed/index.js";

export interface VaultProfile extends Record<string, any> {
  nickname?: string;
}

const VAULT_SEALED_PROFILE_KEY = "vault/profile.sealed";

export async function writeVaultProfile(
  storage: IStorageProvider,
  profile: VaultProfile,
  vaultWorkingKey: string,
  _vaultId: string, // Kept for signature compatibility if needed, but unused in flat model
): Promise<void> {
  const repo = new SealedJsonRepository<VaultProfile>(storage, VAULT_SEALED_PROFILE_KEY, vaultWorkingKey);
  await repo.write(profile, "vault_profile");
}

export async function readVaultProfile(
  storage: IStorageProvider,
  vaultWorkingKey: string,
  _vaultId: string,
): Promise<VaultProfile | null> {
  const repo = new SealedJsonRepository<VaultProfile>(storage, VAULT_SEALED_PROFILE_KEY, vaultWorkingKey);
  return await repo.read(null as any);
}
