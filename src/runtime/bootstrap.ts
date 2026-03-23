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
import { createPrefixedStorage } from "../storage/prefix.js";
import type { IStorageProvider } from "../storage/provider.js";
import type { CreatedIdentity } from "./identity.js";
import { readVaultProfile, writeVaultProfile, readVaultPublicMetadata } from "./vault-metadata.js";
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

function vaultStoragePrefix(vaultId: string): string {
  return `vaults/${vaultId}`;
}

export interface VaultMetadata extends Record<string, any> {
  nickname?: string;
  ownerId?: string;
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

export interface VaultObject {
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

export interface RecoveredVault extends VaultObject {}

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
  // Fallback to default workspace storage for Node.js convenience
  return {
    storage: createWorkspaceStorage(),
    options: storageOrOptions as CreateVaultOptions | RecoverVaultOptions,
  };
}

/**
 * Creates a new vault.
 * 
 * @param storage The storage provider to use.
 * @param options Configuration for the new vault.
 */
export async function createVault(storage: IStorageProvider, options: CreateVaultOptions): Promise<CreatedVault>;
/**
 * Creates a new vault using the default workspace storage.
 * 
 * @param options Configuration for the new vault.
 */
export async function createVault(options: CreateVaultOptions): Promise<CreatedVault>;
export async function createVault(
  storageOrOptions: IStorageProvider | CreateVaultOptions,
  maybeOptions?: CreateVaultOptions,
): Promise<CreatedVault> {
  const { storage: workspaceStorage, options } = resolveStorage(storageOrOptions, maybeOptions) as {
    storage: IStorageProvider;
    options: CreateVaultOptions;
  };
  const vaultId = options.vaultId ?? `vault_${crypto.randomUUID()}`;
  const storage = createPrefixedStorage(workspaceStorage, vaultStoragePrefix(vaultId));
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
  
  // 1. All sensitive metadata is in the private sealed profile (requires owner PK)
  // 2. Discovery metadata (nickname) is in the public sealed profile (requires only vaultId)
  await writeVaultProfile(storage, {
    sealedPrivate: {
      vaultId,
      ownerId: options.ownerIdentity.identityId,
    },
    sealedPublic: {
      vaultId,
      nickname,
    }
  }, vaultWorkingKey, vaultId);

  return {
    core,
    vault: wrapVaultCoreAsVaultService(core, options.vault),
    nickname,
    storage,
  };
}

/**
 * Recovers an existing vault.
 * 
 * @param storage The storage provider where the vault is located.
 * @param options Recovery options including vaultId and owner identity.
 */
export async function recoverVault(storage: IStorageProvider, options: RecoverVaultOptions): Promise<RecoveredVault>;
/**
 * Recovers an existing vault using the default workspace storage.
 * 
 * @param options Recovery options including vaultId and owner identity.
 */
export async function recoverVault(options: RecoverVaultOptions): Promise<RecoveredVault>;
export async function recoverVault(
  storageOrOptions: IStorageProvider | RecoverVaultOptions,
  maybeOptions?: RecoverVaultOptions,
): Promise<RecoveredVault> {
  const { storage: workspaceStorage, options } = resolveStorage(storageOrOptions, maybeOptions) as {
    storage: IStorageProvider;
    options: RecoverVaultOptions;
  };
  const storage = createPrefixedStorage(workspaceStorage, vaultStoragePrefix(options.vaultId));
  const vaultWorkingKey = deriveVaultWorkingKey(options.ownerIdentity.privateKey, options.vaultId);
  const deps = createPersistentVaultCoreDependencies(storage, {
    ...options,
    vaultId: options.vaultId,
    vaultWorkingKey,
  });
  const core = createVaultCore(deps);
  const profile = await readVaultProfile(storage, vaultWorkingKey, options.vaultId);
  if (!profile) {
    throw new Error("vault profile not found or decryption failed");
  }

  return {
    core,
    vault: wrapVaultCoreAsVaultService(core, options.vault),
    nickname: profile.sealedPublic.nickname,
    storage,
  };
}

/**
 * Lists all vaults in the workspace with their discovery metadata.
 */
export async function listVaults(storage: IStorageProvider): Promise<Array<{ vaultId: string; public: any }>> {
  if (!storage.list) {
    return [];
  }
  const ids = await storage.list("vaults");
  const results: Array<{ vaultId: string; public: any }> = [];
  for (const id of ids) {
    const vaultStorage = createPrefixedStorage(storage, vaultStoragePrefix(id));
    const publicData = await readVaultPublicMetadata(vaultStorage, id);
    
    results.push({
      vaultId: id,
      public: publicData || {},
    });
  }
  return results;
}
