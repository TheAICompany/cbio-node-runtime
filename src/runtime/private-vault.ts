import { createHash } from "node:crypto";
import { SealedJsonRepository } from "../sealed/index.js";
import type { IStorageProvider } from "../storage/provider.js";
import { restoreIdentity, type CreatedIdentity } from "./identity.js";

const PRIVATE_VAULT_PREFIX = "identities";
const PRIVATE_VAULT_LOCK_SUFFIX = ".lock";

export interface IdentityPrivateVaultProfile {
  identityId: string;
  publicKey: string;
  nickname?: string;
  parentIdentityId?: string;
  childIndex?: number;
}

export interface IdentityPrivateVaultChildRecord {
  identityId: string;
  parentIdentityId: string;
  childIndex: number;
  nickname?: string;
  publicKey: string;
}

export interface IdentityPrivateVaultChildrenState {
  nextChildIndex: number;
  children: IdentityPrivateVaultChildRecord[];
}


export type IdentityPrivateVaultAccess = CreatedIdentity | string;

export function identityPrivateVaultPrefix(identityId: string): string {
  return `${PRIVATE_VAULT_PREFIX}/${identityId}`;
}

export function identityPrivateVaultProfileKey(identityId: string): string {
  return `${identityPrivateVaultPrefix(identityId)}/sealed/profile.sealed`;
}

export function identityPrivateVaultPublicSealedKey(identityId: string): string {
  return `${identityPrivateVaultPrefix(identityId)}/sealed/public.sealed`;
}

export function identityPrivateVaultChildrenKey(identityId: string): string {
  return `${identityPrivateVaultPrefix(identityId)}/sealed/children.sealed`;
}

function lockKey(identityId: string): string {
  return `${identityPrivateVaultPrefix(identityId)}/sealed/locks/vault${PRIVATE_VAULT_LOCK_SUFFIX}`;
}

function normalizeIdentityAccess(identityOrPrivateKey: IdentityPrivateVaultAccess): CreatedIdentity {
  if (typeof identityOrPrivateKey === "string") {
    return restoreIdentity(identityOrPrivateKey);
  }
  return identityOrPrivateKey;
}

function deriveIdentityPrivateVaultKey(identity: CreatedIdentity): string {
  return createHash("sha256")
    .update("cbio:identity-private-vault:v1")
    .update("\n")
    .update(identity.identityId)
    .update("\n")
    .update(identity.privateKey)
    .digest("base64url");
}

function deriveIdentityPrivateVaultPublicWorkingKey(identityId: string): string {
  return createHash("sha256")
    .update("cbio:identity-public-metadata:v1")
    .update("\n")
    .update(identityId)
    .digest("base64url");
}

export async function ensureIdentityPrivateVault(
  storage: IStorageProvider,
  identity: CreatedIdentity,
): Promise<void> {
  const profileKey = identityPrivateVaultProfileKey(identity.identityId);
  const profileRepo = new SealedJsonRepository<IdentityPrivateVaultProfile>(
    storage,
    profileKey,
    deriveIdentityPrivateVaultKey(identity),
  );

  const existingProfile = await profileRepo.read(null as any);
  
  const profile: IdentityPrivateVaultProfile = {
    identityId: identity.identityId,
    publicKey: identity.publicKey,
    nickname: identity.nickname || existingProfile?.nickname,
    parentIdentityId: identity.parentIdentityId || existingProfile?.parentIdentityId,
    childIndex: identity.childIndex ?? existingProfile?.childIndex,
  };

  // 1. Write Private Sealed Profile
  await profileRepo.write(profile, "identity_private_vault_profile");

  // 2. Write Public Sealed Metadata for Discovery (Encrypted for integrity, but publicly readable)
  const publicSealedKey = identityPrivateVaultPublicSealedKey(identity.identityId);
  const publicRepo = new SealedJsonRepository<any>(
    storage,
    publicSealedKey,
    deriveIdentityPrivateVaultPublicWorkingKey(identity.identityId)
  );
  await publicRepo.write({
    identityId: profile.identityId,
    publicKey: profile.publicKey,
    nickname: profile.nickname,
    parentIdentityId: profile.parentIdentityId,
  }, "identity_public_metadata");

  const childrenKey = identityPrivateVaultChildrenKey(identity.identityId);
  if (!(await storage.has(childrenKey))) {
    const emptyState: IdentityPrivateVaultChildrenState = {
      nextChildIndex: 0,
      children: [],
    };
    const childrenRepo = new SealedJsonRepository<IdentityPrivateVaultChildrenState>(
      storage,
      childrenKey,
      deriveIdentityPrivateVaultKey(identity),
    );
    await childrenRepo.write(emptyState, "identity_private_vault_children");
  }
}

export async function readIdentityPrivateVaultProfile(
  storage: IStorageProvider,
  identityOrPrivateKey: IdentityPrivateVaultAccess,
): Promise<IdentityPrivateVaultProfile | null> {
  const identity = normalizeIdentityAccess(identityOrPrivateKey);
  const repo = new SealedJsonRepository<IdentityPrivateVaultProfile>(
    storage,
    identityPrivateVaultProfileKey(identity.identityId),
    deriveIdentityPrivateVaultKey(identity),
  );
  return repo.read(null as any);
}

/**
 * Metadata reader for identities.
 * Discovery info (nickname) can be read with just identityId.
 * Full profile requires privateKey.
 */
export async function readIdentityMetadata(
  storage: IStorageProvider,
  identityId: string,
  privateKey?: string,
): Promise<IdentityPrivateVaultProfile | any | null> {
  const publicSealedKey = identityPrivateVaultPublicSealedKey(identityId);
  const publicRepo = new SealedJsonRepository<any>(
    storage,
    publicSealedKey,
    deriveIdentityPrivateVaultPublicWorkingKey(identityId)
  );
  const publicMetadata = await publicRepo.read(null as any).catch(() => null);

  if (privateKey) {
    try {
      const identity = restoreIdentity(privateKey);
      if (identity.identityId !== identityId) {
        throw new Error("identityId mismatch");
      }
      const sealed = await readIdentityPrivateVaultProfile(storage, identity);
      return {
        ...(publicMetadata || {}),
        ...(sealed || {}),
      };
    } catch (e) {
      console.warn(`[IdentityMetadata] Decryption failed for ${identityId}:`, e);
    }
  }

  return publicMetadata;
}

export async function readIdentityPrivateVaultChildrenState(
  storage: IStorageProvider,
  identityOrPrivateKey: IdentityPrivateVaultAccess,
): Promise<IdentityPrivateVaultChildrenState> {
  const identity = normalizeIdentityAccess(identityOrPrivateKey);
  const repo = new SealedJsonRepository<IdentityPrivateVaultChildrenState>(
    storage,
    identityPrivateVaultChildrenKey(identity.identityId),
    deriveIdentityPrivateVaultKey(identity),
  );
  const parsed = await repo.read({ nextChildIndex: 0, children: [] });
  return {
    nextChildIndex: parsed.nextChildIndex ?? parsed.children.length,
    children: parsed.children ?? [],
  };
}

export async function writeIdentityPrivateVaultChildrenState(
  storage: IStorageProvider,
  identityOrPrivateKey: IdentityPrivateVaultAccess,
  state: IdentityPrivateVaultChildrenState,
): Promise<void> {
  const identity = normalizeIdentityAccess(identityOrPrivateKey);
  const repo = new SealedJsonRepository<IdentityPrivateVaultChildrenState>(
    storage,
    identityPrivateVaultChildrenKey(identity.identityId),
    deriveIdentityPrivateVaultKey(identity),
  );
  await repo.write(state, "identity_private_vault_children");
}

export async function withIdentityPrivateVaultLock<T>(
  storage: IStorageProvider,
  identityOrPrivateKey: IdentityPrivateVaultAccess,
  task: () => Promise<T>,
): Promise<T> {
  const identity = normalizeIdentityAccess(identityOrPrivateKey);
  if (storage.withLock) {
    return storage.withLock(lockKey(identity.identityId), task);
  }
  return task();
}

/**
 * Lists all identities in the workspace with their discovery metadata.
 */
export async function listIdentities(storage: IStorageProvider): Promise<any[]> {
  if (!storage.list) {
    return [];
  }
  const ids = await storage.list(PRIVATE_VAULT_PREFIX);
  const results: any[] = [];
  for (const id of ids) {
    if (id.endsWith(PRIVATE_VAULT_LOCK_SUFFIX)) continue;
    
    const profile = await readIdentityMetadata(storage, id);
    if (profile) {
      results.push(profile);
    }
  }
  return results;
}
