import { Buffer } from "node:buffer";
import type { IStorageProvider } from "../storage/provider.js";

export interface VaultProfile {
  vaultId: string;
  nickname?: string;
}

const VAULT_PROFILE_KEY = "vault/profile.json";

export async function writeVaultProfile(
  storage: IStorageProvider,
  profile: VaultProfile,
): Promise<void> {
  await storage.write(VAULT_PROFILE_KEY, Buffer.from(JSON.stringify(profile, null, 2)));
}

export async function readVaultProfile(storage: IStorageProvider): Promise<VaultProfile | null> {
  const payload = await storage.read(VAULT_PROFILE_KEY);
  if (!payload) {
    return null;
  }
  return JSON.parse(payload.toString("utf8")) as VaultProfile;
}
