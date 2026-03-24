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
import { FsStorageProvider } from "../storage/fs.js";
import type { IStorageProvider } from "../storage/provider.js";
import type { CreatedIdentity } from "./identity.js";
import { readVaultProfile, writeVaultProfile, readVaultPublicMetadata } from "./vault-metadata.js";
import { createWorkspaceStorage } from "./workspace-storage.js";

/**
 * Derives the deterministic working key for a vault.
 * 
 * @param privateKey - The owner's private key.
 * @param vaultId - The unique ID of the vault.
 * @returns A base64url-encoded 256-bit key.
 * @internal Used by `createVault` and `recoverVault`.
 */
export function deriveVaultWorkingKey(privateKey: string, vaultId: string): string {
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
  publicMetadata?: Record<string, any>;
  ownerIdentity: CreatedIdentity;
  vault?: {
    customFlows?: VaultCustomFlowResolver;
    fetchImpl?: typeof fetch;
  };
}

/**
 * Represents a vault instance with its core logic and service layer.
 */
export interface CreatedVault {
  /** The low-level vault core. */
  core: VaultCore;
  /** The high-level service interface for dispatch and acquisition. */
  vault: VaultService;
  /** Human-readable nickname. */
  nickname?: string;
  /** The anchored storage provider for this vault. */
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
  storageOrOptions: IStorageProvider | string | CreateVaultOptions | RecoverVaultOptions,
  maybeOptions?: CreateVaultOptions | RecoverVaultOptions,
): { storage: IStorageProvider; options: CreateVaultOptions | RecoverVaultOptions } {
  if (maybeOptions) {
    const storage = typeof storageOrOptions === "string" 
      ? new FsStorageProvider(storageOrOptions)
      : storageOrOptions as IStorageProvider;
    return {
      storage,
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
 * Creates and bootstraps a new persistent vault.
 *
 * @param storage - Workspace storage (or path string) where vaults are stored.
 * @param options - Configuration including owner identity and metadata.
 * @returns A {@link CreatedVault} instance.
 *
 * @example
 * ```ts
 * const vault = await createVault({
 *   ownerIdentity,
 *   nickname: 'production-secrets'
 * });
 * ```
 */
export async function createVault(storage: IStorageProvider | string, options: CreateVaultOptions): Promise<CreatedVault>;
/**
 * Creates a new vault using the default workspace storage.
 * 
 * @param options Configuration for the new vault.
 */
export async function createVault(options: CreateVaultOptions): Promise<CreatedVault>;
export async function createVault(
  storageOrOptions: IStorageProvider | string | CreateVaultOptions,
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
  
  // 1. Critical configuration (e.g. key materials, sensitive bounds) remains in private
  // 2. Discovery metadata (ownerId, nickname, custom tags) is stored in the public sealed profile for easy UI retrieval
  await writeVaultProfile(storage, {
    sealedPrivate: {
      vaultId,
      ownerId: options.ownerIdentity.identityId,
    },
    sealedPublic: {
      vaultId,
      ownerId: options.ownerIdentity.identityId,
      ...options.publicMetadata,
      nickname, // Nickname override takes precedence
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
 * Reopens an existing vault from storage.
 *
 * @param storage - Workspace storage where the vault was created.
 * @param options - Recovery options (must include `vaultId` and `ownerIdentity`).
 * @returns A {@link RecoveredVault} instance.
 *
 * @example
 * ```ts
 * const vault = await recoverVault({
 *   vaultId: 'vault_123',
 *   ownerIdentity
 * });
 * ```
 */
export async function recoverVault(storage: IStorageProvider | string, options: RecoverVaultOptions): Promise<RecoveredVault>;
/**
 * Recovers an existing vault using the default workspace storage.
 * 
 * @param options Recovery options including vaultId and owner identity.
 */
export async function recoverVault(options: RecoverVaultOptions): Promise<RecoveredVault>;
export async function recoverVault(
  storageOrOptions: IStorageProvider | string | RecoverVaultOptions,
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
 * Lists all available vaults in the workspace by scanning for signed profiles.
 *
 * @param storage - The root workspace storage provider.
 * @returns A list of vault IDs and their public discovery metadata.
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

/**
 * Updates the metadata (like nickname) of an existing vault.
 */
export async function updateVaultMetadata(
  vault: CreatedVault | RecoveredVault,
  options: { nickname?: string; publicMetadata?: Record<string, any>; ownerIdentity: CreatedIdentity },
): Promise<void> {
  const vaultId = vault.core.vaultId.value;
  const vaultWorkingKey = deriveVaultWorkingKey(options.ownerIdentity.privateKey, vaultId);
  
  // Read current profile to preserve secret part
  const current = await readVaultProfile(vault.storage, vaultWorkingKey, vaultId);
  
  await writeVaultProfile(vault.storage, {
    sealedPrivate: current?.sealedPrivate || { vaultId, ownerId: options.ownerIdentity.identityId },
    sealedPublic: {
      ...current?.sealedPublic, // Preserve existing public metadata
      vaultId,
      ownerId: options.ownerIdentity.identityId, // Ensure ownerId is always populated for discovery
      ...(options.publicMetadata ?? {}), // Merge new custom fields if any
      nickname: options.nickname ?? current?.sealedPublic.nickname,
    }
  }, vaultWorkingKey, vaultId);
}


