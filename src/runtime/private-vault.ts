import { Buffer } from "node:buffer";
import type { IStorageProvider } from "../storage/provider.js";
import type { CreatedIdentity } from "./identity.js";

const PRIVATE_VAULT_PREFIX = "vault/private/identities";
const PRIVATE_VAULT_LOCK_SUFFIX = ".lock";

export interface PrivateVaultProfile {
  identityId: string;
  nickname?: string;
  publicKey: string;
  parentIdentityId?: string;
  childIndex?: number;
}

export interface PrivateVaultChildRecord {
  identityId: string;
  parentIdentityId: string;
  childIndex: number;
  nickname?: string;
  publicKey: string;
}

export interface PrivateVaultChildrenState {
  nextChildIndex: number;
  children: PrivateVaultChildRecord[];
}

export function privateVaultPrefix(identityId: string): string {
  return `${PRIVATE_VAULT_PREFIX}/${identityId}`;
}

export function privateVaultProfileKey(identityId: string): string {
  return `${privateVaultPrefix(identityId)}/profile.json`;
}

export function privateVaultChildrenKey(identityId: string): string {
  return `${privateVaultPrefix(identityId)}/children.json`;
}

function lockKey(identityId: string): string {
  return `${privateVaultPrefix(identityId)}${PRIVATE_VAULT_LOCK_SUFFIX}`;
}

export async function ensurePrivateVault(
  storage: IStorageProvider,
  identity: CreatedIdentity,
): Promise<void> {
  const profile: PrivateVaultProfile = {
    identityId: identity.identityId,
    nickname: identity.nickname,
    publicKey: identity.publicKey,
    parentIdentityId: identity.parentIdentityId,
    childIndex: identity.childIndex,
  };
  await storage.write(
    privateVaultProfileKey(identity.identityId),
    Buffer.from(JSON.stringify(profile, null, 2)),
  );

  const childrenKey = privateVaultChildrenKey(identity.identityId);
  if (!(await storage.has(childrenKey))) {
    const emptyState: PrivateVaultChildrenState = {
      nextChildIndex: 0,
      children: [],
    };
    await storage.write(childrenKey, Buffer.from(JSON.stringify(emptyState, null, 2)));
  }
}

export async function readPrivateVaultProfile(
  storage: IStorageProvider,
  identityId: string,
): Promise<PrivateVaultProfile | null> {
  const raw = await storage.read(privateVaultProfileKey(identityId));
  if (!raw) {
    return null;
  }
  return JSON.parse(raw.toString("utf8")) as PrivateVaultProfile;
}

export async function readPrivateVaultChildrenState(
  storage: IStorageProvider,
  identityId: string,
): Promise<PrivateVaultChildrenState> {
  const raw = await storage.read(privateVaultChildrenKey(identityId));
  if (!raw) {
    return { nextChildIndex: 0, children: [] };
  }
  const parsed = JSON.parse(raw.toString("utf8")) as PrivateVaultChildrenState;
  return {
    nextChildIndex: parsed.nextChildIndex ?? parsed.children.length,
    children: parsed.children ?? [],
  };
}

export async function writePrivateVaultChildrenState(
  storage: IStorageProvider,
  identityId: string,
  state: PrivateVaultChildrenState,
): Promise<void> {
  await storage.write(
    privateVaultChildrenKey(identityId),
    Buffer.from(JSON.stringify(state, null, 2)),
  );
}

export async function withPrivateVaultLock<T>(
  storage: IStorageProvider,
  identityId: string,
  task: () => Promise<T>,
): Promise<T> {
  if (storage.withLock) {
    return storage.withLock(lockKey(identityId), task);
  }
  return task();
}
