import { createVaultCore } from "../vault-core/core.js";
import {
  createPersistentVaultCoreDependencies,
  type CreatePersistentVaultCoreDependenciesOptions,
  VaultCore,
} from "../vault-core/index.js";
import { deriveVaultWorkingKeyFromPassword } from "../protocol/crypto.js";
import {
  wrapVaultCoreAsVaultService,
  type VaultService,
  type VaultCustomFlowResolver,
} from "../vault-ingress/index.js";
import { createPrefixedStorage } from "../storage/prefix.js";
import { FsStorageProvider } from "../storage/fs.js";
import type { IStorageProvider } from "../storage/provider.js";
import { createVaultIdValue } from "../internal/id-factory.js";
import type { CreatedIdentity } from "./identity.js";
import { readVaultProfile, writeVaultProfile } from "./vault-metadata.js";
import { createWorkspaceStorage } from "./workspace-storage.js";

const VAULT_STORAGE_LAYOUT_VERSION = 1;
const VAULT_STORAGE_DIR_VERSION_SUFFIX = `_v${VAULT_STORAGE_LAYOUT_VERSION}`;

function vaultStoragePrefix(vaultId: string): string {
  return `vaults/${vaultId}${VAULT_STORAGE_DIR_VERSION_SUFFIX}`;
}

function parseVaultStorageDirName(entry: string): { vaultId: string; version: number } | null {
  const match = /^(.*)_v(\d+)$/.exec(entry);
  if (!match) {
    return null;
  }
  return {
    vaultId: match[1],
    version: Number.parseInt(match[2], 10),
  };
}

export interface VaultMetadata extends Record<string, any> {
  nickname?: string;
  ownerId?: string;
}

export interface CreateVaultOptions extends Omit<CreatePersistentVaultCoreDependenciesOptions, "vaultWorkingKey" | "vaultId"> {
  nickname?: string;
  metadata?: Record<string, any>;
  password: string;
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
  /** Verifies whether a supplied password can unlock this vault. */
  verifyPassword(password: string): Promise<boolean>;
}

export interface VaultObject {
  core: VaultCore;
  vault: VaultService;
  nickname?: string;
  storage: IStorageProvider;
  verifyPassword(password: string): Promise<boolean>;
}

export interface RecoverVaultOptions extends Omit<CreatePersistentVaultCoreDependenciesOptions, "vaultWorkingKey" | "vaultId"> {
  vaultId: string;
  password: string;
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

async function verifyVaultPassword(storage: IStorageProvider, vaultId: string, password: string): Promise<boolean> {
  const normalizedPassword = password.trim();
  if (!normalizedPassword) {
    return false;
  }
  const vaultWorkingKey = deriveVaultWorkingKeyFromPassword(normalizedPassword, vaultId);
  const profile = await readVaultProfile(storage, vaultWorkingKey, vaultId);
  return profile !== null;
}

/**
 * Creates and bootstraps a new persistent vault.
 *
 * @param storage - Workspace storage (or path string) where vaults are stored.
 * @param options - Configuration including password and metadata.
 * @returns A {@link CreatedVault} instance.
 *
 * @example
 * ```ts
 * const vault = await createVault({
 *   password: 'my-strong-password',
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
  if ("vaultId" in (options as unknown as Record<string, unknown>)) {
    throw new Error("createVault() no longer accepts caller-supplied vaultId");
  }
  const vaultId = createVaultIdValue();
  const storage = createPrefixedStorage(workspaceStorage, vaultStoragePrefix(vaultId));
  const vaultWorkingKey = deriveVaultWorkingKeyFromPassword(options.password, vaultId);

  const deps = createPersistentVaultCoreDependencies(storage, {
    ...options,
    vaultId,
    vaultWorkingKey,
  });
  const core = createVaultCore(deps);
  
  const nickname = options.nickname?.trim() ? options.nickname.trim() : undefined;
  
  // Single encrypted profile block. Hold the password to see everything.
  await writeVaultProfile(storage, {
    vaultId,
    nickname,
    ...options.metadata,
  }, vaultWorkingKey, vaultId);


  return {
    core,
    vault: wrapVaultCoreAsVaultService(core, options.vault),
    nickname,
    storage,
    verifyPassword: async (password: string) => verifyVaultPassword(storage, vaultId, password),
  };
}

/**
 * Reopens an existing vault from storage.
 *
 * @param storage - Workspace storage where the vault was created.
 * @param options - Recovery options (must include `vaultId` and `password`).
 * @returns A {@link RecoveredVault} instance.
 *
 * @example
 * ```ts
 * const vault = await recoverVault({
 *   vaultId: 'vault_123',
 *   password: 'my-strong-password'
 * });
 * ```
 */
export async function recoverVault(storage: IStorageProvider | string, options: RecoverVaultOptions): Promise<RecoveredVault>;
/**
 * Recovers an existing vault using the default workspace storage.
 * 
 * @param options Recovery options including vaultId and password.
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
  const vaultWorkingKey = deriveVaultWorkingKeyFromPassword(options.password, options.vaultId);
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
    nickname: profile.nickname,
    storage,
    verifyPassword: async (password: string) => verifyVaultPassword(storage, options.vaultId, password),
  };
}

/**
 * Lists all available vaults in the workspace.
 *
 * @param storage - The root workspace storage provider.
 * @returns A list of vault IDs.
 */
export async function listVaults(storage: IStorageProvider): Promise<string[]> {
  if (!storage.list) {
    return [];
  }
  const entries = await storage.list("vaults");
  const latestByVaultId = new Map<string, number>();
  for (const entry of entries) {
    const parsed = parseVaultStorageDirName(entry);
    if (!parsed) {
      continue;
    }
    const current = latestByVaultId.get(parsed.vaultId);
    if (current === undefined || parsed.version > current) {
      latestByVaultId.set(parsed.vaultId, parsed.version);
    }
  }
  return [...latestByVaultId.keys()];
}

/**
 * Updates the metadata (like nickname) of an existing vault.
 */
export async function updateVaultMetadata(
  vault: CreatedVault | RecoveredVault,
  options: { nickname?: string; metadata?: Record<string, any>; password: string },
): Promise<void> {
  const vaultId = vault.core.vaultId.value;
  const vaultWorkingKey = deriveVaultWorkingKeyFromPassword(options.password, vaultId);
  
  // Read current profile to preserve other fields
  const current = await readVaultProfile(vault.storage, vaultWorkingKey, vaultId);
  
  await writeVaultProfile(vault.storage, {
    ...(current || {}),
    nickname: options.nickname ?? current?.nickname,
    ...(options.metadata ?? {}),
  }, vaultWorkingKey, vaultId);
}
