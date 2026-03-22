import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { SEALED_BLOB_VERSION, sealBlob, unsealBlob } from "../sealed/seal.js";
import type { IStorageProvider } from "../storage/provider.js";
import { restoreIdentity, type CreatedIdentity } from "./identity.js";

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

type IdentityPrivateVaultAccess = CreatedIdentity | string;

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

function sealIdentityPrivateVaultJson(identity: CreatedIdentity, value: unknown, kind: string): Buffer {
  const sealed = sealBlob(
    {
      version: SEALED_BLOB_VERSION,
      secrets: {
        payload: JSON.stringify(value),
      },
      secretMetadata: {
        kind,
        identityId: identity.identityId,
      },
    },
    deriveIdentityPrivateVaultKey(identity),
  );
  return Buffer.from(sealed, "utf8");
}

function unsealIdentityPrivateVaultJson<T>(
  identity: CreatedIdentity,
  payload: Buffer,
  expectedKind: string,
): T {
  const unsealed = unsealBlob(payload.toString("utf8"), deriveIdentityPrivateVaultKey(identity));
  if (unsealed.secretMetadata.kind !== expectedKind) {
    throw new Error(`unexpected identity private vault payload kind: ${String(unsealed.secretMetadata.kind)}`);
  }
  if (unsealed.secretMetadata.identityId !== identity.identityId) {
    throw new Error("identity private vault payload identity mismatch");
  }
  const secretPayload = unsealed.secrets.payload;
  if (typeof secretPayload !== "string") {
    throw new Error("identity private vault payload missing body");
  }
  return JSON.parse(secretPayload) as T;
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
    sealIdentityPrivateVaultJson(identity, profile, "identity_private_vault_profile"),
  );

  const childrenKey = identityPrivateVaultChildrenKey(identity.identityId);
  if (!(await storage.has(childrenKey))) {
    const emptyState: IdentityPrivateVaultChildrenState = {
      nextChildIndex: 0,
      children: [],
    };
    await storage.write(
      childrenKey,
      sealIdentityPrivateVaultJson(identity, emptyState, "identity_private_vault_children"),
    );
  }
}

export async function readIdentityPrivateVaultProfile(
  storage: IStorageProvider,
  identityOrPrivateKey: IdentityPrivateVaultAccess,
): Promise<IdentityPrivateVaultProfile | null> {
  const identity = normalizeIdentityAccess(identityOrPrivateKey);
  const raw = await storage.read(identityPrivateVaultProfileKey(identity.identityId));
  if (!raw) {
    return null;
  }
  return unsealIdentityPrivateVaultJson<IdentityPrivateVaultProfile>(
    identity,
    raw,
    "identity_private_vault_profile",
  );
}

export async function readIdentityPrivateVaultChildrenState(
  storage: IStorageProvider,
  identityOrPrivateKey: IdentityPrivateVaultAccess,
): Promise<IdentityPrivateVaultChildrenState> {
  const identity = normalizeIdentityAccess(identityOrPrivateKey);
  const raw = await storage.read(identityPrivateVaultChildrenKey(identity.identityId));
  if (!raw) {
    return { nextChildIndex: 0, children: [] };
  }
  const parsed = unsealIdentityPrivateVaultJson<IdentityPrivateVaultChildrenState>(
    identity,
    raw,
    "identity_private_vault_children",
  );
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
  await storage.write(
    identityPrivateVaultChildrenKey(identity.identityId),
    sealIdentityPrivateVaultJson(identity, state, "identity_private_vault_children"),
  );
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
