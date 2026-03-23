import { createHash } from "node:crypto";
import { SealedJsonRepository } from "../sealed/index.js";
import type { IStorageProvider } from "../storage/provider.js";
import { restoreIdentity, type CreatedIdentity } from "./identity.js";

const PRIVATE_VAULT_PREFIX = "identities";
const PRIVATE_VAULT_LOCK_SUFFIX = ".lock";

export interface IdentityPrivateVaultProfile {
  identityId: string;
  nickname?: string;
  publicKey: string;
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

type IdentityPrivateVaultAccess = CreatedIdentity | string;

export function identityPrivateVaultPrefix(identityId: string): string {
  return `${PRIVATE_VAULT_PREFIX}/${identityId}`;
}

export function identityPrivateVaultProfileKey(identityId: string): string {
  return `${identityPrivateVaultPrefix(identityId)}/sealed/profile.sealed`;
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

export async function ensureIdentityPrivateVault(
  storage: IStorageProvider,
  identity: CreatedIdentity,
): Promise<void> {
  const profile: IdentityPrivateVaultProfile = {
    identityId: identity.identityId,
    nickname: identity.nickname,
    publicKey: identity.publicKey,
    parentIdentityId: identity.parentIdentityId,
    childIndex: identity.childIndex,
  };
  const profileRepo = new SealedJsonRepository<IdentityPrivateVaultProfile>(
    storage,
    identityPrivateVaultProfileKey(identity.identityId),
    deriveIdentityPrivateVaultKey(identity),
  );
  await profileRepo.write(profile, "identity_private_vault_profile");

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
