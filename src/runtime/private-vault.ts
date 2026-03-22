import { Buffer } from "node:buffer";
import type { IStorageProvider } from "../storage/provider.js";
import type { CreatedIdentity } from "./identity.js";

const PRIVATE_VAULT_PREFIX = "vault/private/identities";
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

export function identityPrivateVaultPrefix(identityId: string): string {
  return `${PRIVATE_VAULT_PREFIX}/${identityId}`;
}

export function identityPrivateVaultProfileKey(identityId: string): string {
  return `${identityPrivateVaultPrefix(identityId)}/profile.json`;
}

export function identityPrivateVaultChildrenKey(identityId: string): string {
  return `${identityPrivateVaultPrefix(identityId)}/children.json`;
}

function lockKey(identityId: string): string {
  return `${identityPrivateVaultPrefix(identityId)}${PRIVATE_VAULT_LOCK_SUFFIX}`;
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
  await storage.write(
    identityPrivateVaultProfileKey(identity.identityId),
    Buffer.from(JSON.stringify(profile, null, 2)),
  );

  const childrenKey = identityPrivateVaultChildrenKey(identity.identityId);
  if (!(await storage.has(childrenKey))) {
    const emptyState: IdentityPrivateVaultChildrenState = {
      nextChildIndex: 0,
      children: [],
    };
    await storage.write(childrenKey, Buffer.from(JSON.stringify(emptyState, null, 2)));
  }
}

export async function readIdentityPrivateVaultProfile(
  storage: IStorageProvider,
  identityId: string,
): Promise<IdentityPrivateVaultProfile | null> {
  const raw = await storage.read(identityPrivateVaultProfileKey(identityId));
  if (!raw) {
    return null;
  }
  return JSON.parse(raw.toString("utf8")) as IdentityPrivateVaultProfile;
}

export async function readIdentityPrivateVaultChildrenState(
  storage: IStorageProvider,
  identityId: string,
): Promise<IdentityPrivateVaultChildrenState> {
  const raw = await storage.read(identityPrivateVaultChildrenKey(identityId));
  if (!raw) {
    return { nextChildIndex: 0, children: [] };
  }
  const parsed = JSON.parse(raw.toString("utf8")) as IdentityPrivateVaultChildrenState;
  return {
    nextChildIndex: parsed.nextChildIndex ?? parsed.children.length,
    children: parsed.children ?? [],
  };
}

export async function writeIdentityPrivateVaultChildrenState(
  storage: IStorageProvider,
  identityId: string,
  state: IdentityPrivateVaultChildrenState,
): Promise<void> {
  await storage.write(
    identityPrivateVaultChildrenKey(identityId),
    Buffer.from(JSON.stringify(state, null, 2)),
  );
}

export async function withIdentityPrivateVaultLock<T>(
  storage: IStorageProvider,
  identityId: string,
  task: () => Promise<T>,
): Promise<T> {
  if (storage.withLock) {
    return storage.withLock(lockKey(identityId), task);
  }
  return task();
}
