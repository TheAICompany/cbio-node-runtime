import { Buffer } from "node:buffer";
import type { IStorageProvider } from "../storage/provider.js";
import { SealedJsonRepository } from "../sealed/index.js";

export interface VaultProfile {
  vaultId: string;
  nickname?: string;
  exposeNickname?: boolean;
}

const VAULT_PROFILE_KEY = "vault/profile.sealed";
const VAULT_NICKNAME_EXPOSED_KEY = "vault/nickname.txt";

export async function writeVaultProfile(
  storage: IStorageProvider,
  profile: VaultProfile,
  vaultWorkingKey: string,
): Promise<void> {
  const repo = new SealedJsonRepository<VaultProfile>(storage, VAULT_PROFILE_KEY, vaultWorkingKey);
  await repo.write(profile, "vault_profile");

  if (profile.exposeNickname && profile.nickname) {
    await storage.write(VAULT_NICKNAME_EXPOSED_KEY, Buffer.from(profile.nickname, "utf8"));
  } else {
    if (await storage.has(VAULT_NICKNAME_EXPOSED_KEY)) {
      await storage.delete(VAULT_NICKNAME_EXPOSED_KEY);
    }
  }
}

export async function readVaultProfile(
  storage: IStorageProvider,
  vaultWorkingKey: string,
): Promise<VaultProfile | null> {
  const repo = new SealedJsonRepository<VaultProfile>(storage, VAULT_PROFILE_KEY, vaultWorkingKey);
  // We use read with null fallback if it doesn't exist.
  // Actually SealedJsonRepository.read needs a fallback value.
  const profile = await repo.read(null as any);
  return profile;
}
