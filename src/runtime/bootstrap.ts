import crypto from "node:crypto";
import { createVaultCore } from "../vault-core/core.js";
import {
  createPersistentVaultCoreDependencies,
  type CreatePersistentVaultCoreDependenciesOptions,
  type OwnerIdentityRecord,
  type VaultCore,
} from "../vault-core/index.js";
import {
  wrapVaultCoreAsVaultService,
  type VaultService,
  type VaultCustomFlowResolver,
} from "../vault-ingress/index.js";
import type { IStorageProvider } from "../storage/provider.js";
import type { CreatedIdentity } from "./identity.js";
import { readVaultProfile, writeVaultProfile } from "./vault-metadata.js";
import { createWorkspaceStorage } from "./workspace-storage.js";

function deriveVaultWorkingKey(privateKey: string, vaultId: string): string {
  return crypto
    .createHash("sha256")
    .update("cbio:vault-working-key:v1")
    .update("\n")
    .update(vaultId)
    .update("\n")
    .update(privateKey)
    .digest("base64url");
}

export interface CreateVaultOptions extends Omit<CreatePersistentVaultCoreDependenciesOptions, "vaultWorkingKey" | "vaultId"> {
  vaultId?: string;
  nickname?: string;
  ownerIdentity: CreatedIdentity;
  vault?: {
    customFlows?: VaultCustomFlowResolver;
    fetchImpl?: typeof fetch;
  };
}

export interface CreatedVault {
  core: VaultCore;
  vault: VaultService;
  nickname?: string;
  storage: IStorageProvider;
}

export interface RecoverVaultOptions extends Omit<CreatePersistentVaultCoreDependenciesOptions, "vaultWorkingKey" | "vaultId"> {
  vaultId: string;
  ownerIdentity: CreatedIdentity;
  vault?: {
    customFlows?: VaultCustomFlowResolver;
    fetchImpl?: typeof fetch;
  };
}

export interface RecoveredVault {
  core: VaultCore;
  vault: VaultService;
  nickname?: string;
  storage: IStorageProvider;
}

function resolveStorage(
  storageOrOptions: IStorageProvider | CreateVaultOptions | RecoverVaultOptions,
  maybeOptions?: CreateVaultOptions | RecoverVaultOptions,
): { storage: IStorageProvider; options: CreateVaultOptions | RecoverVaultOptions } {
  if (maybeOptions) {
    return {
      storage: storageOrOptions as IStorageProvider,
      options: maybeOptions,
    };
  }
  return {
    storage: createWorkspaceStorage(),
    options: storageOrOptions as CreateVaultOptions | RecoverVaultOptions,
  };
}

export async function createVault(options: CreateVaultOptions): Promise<CreatedVault>;
export async function createVault(storage: IStorageProvider, options: CreateVaultOptions): Promise<CreatedVault>;
export async function createVault(
  storageOrOptions: IStorageProvider | CreateVaultOptions,
  maybeOptions?: CreateVaultOptions,
): Promise<CreatedVault> {
  const { storage, options } = resolveStorage(storageOrOptions, maybeOptions) as {
    storage: IStorageProvider;
    options: CreateVaultOptions;
  };
  const vaultId = options.vaultId ?? `vault_${crypto.randomUUID()}`;
  const vaultWorkingKey = deriveVaultWorkingKey(options.ownerIdentity.privateKey, vaultId);
  const deps = createPersistentVaultCoreDependencies(storage, {
    ...options,
    vaultId,
    vaultWorkingKey,
  });
  const core = createVaultCore(deps);
  const bootstrapOwner: OwnerIdentityRecord = {
    vaultId: core.vaultId,
    ownerId: options.ownerIdentity.identityId,
    publicKey: options.ownerIdentity.publicKey,
  };
  await core.bootstrapOwnerIdentity(bootstrapOwner);
  const nickname = options.nickname?.trim() ? options.nickname.trim() : undefined;
  await writeVaultProfile(storage, {
    vaultId,
    nickname,
  });
  return {
    core,
    vault: wrapVaultCoreAsVaultService(core, options.vault),
    nickname,
    storage,
  };
}

export async function recoverVault(options: RecoverVaultOptions): Promise<RecoveredVault>;
export async function recoverVault(storage: IStorageProvider, options: RecoverVaultOptions): Promise<RecoveredVault>;
export async function recoverVault(
  storageOrOptions: IStorageProvider | RecoverVaultOptions,
  maybeOptions?: RecoverVaultOptions,
): Promise<RecoveredVault> {
  const { storage, options } = resolveStorage(storageOrOptions, maybeOptions) as {
    storage: IStorageProvider;
    options: RecoverVaultOptions;
  };
  const vaultWorkingKey = deriveVaultWorkingKey(options.ownerIdentity.privateKey, options.vaultId);
  const deps = createPersistentVaultCoreDependencies(storage, {
    ...options,
    vaultId: options.vaultId,
    vaultWorkingKey,
  });
  const core = createVaultCore(deps);
  const profile = await readVaultProfile(storage);
  return {
    core,
    vault: wrapVaultCoreAsVaultService(core, options.vault),
    nickname: profile?.nickname,
    storage,
  };
}
