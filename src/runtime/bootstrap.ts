import { createVaultCore } from "../vault-core/core.js";
import {
  createPersistentVaultCoreDependencies,
  initializeVaultCustody,
  recoverVaultWorkingKey,
  type CreatePersistentVaultCoreDependenciesOptions,
  type InitializedVaultCustody,
  type InitializeVaultCustodyOptions,
  type OwnerIdentityRecord,
  type VaultCore,
} from "../vault-core/index.js";
import {
  wrapVaultCoreAsVaultService,
  type VaultService,
  type VaultCustomFlowResolver,
} from "../vault-ingress/index.js";
import type { IStorageProvider } from "../storage/provider.js";

export interface CreateOwnedVaultOptions extends Omit<CreatePersistentVaultCoreDependenciesOptions, "vaultWorkingKey"> {
  custody?: InitializeVaultCustodyOptions;
  bootstrapOwner: OwnerIdentityRecord;
  vault?: {
    customFlows?: VaultCustomFlowResolver;
    fetchImpl?: typeof fetch;
  };
}

export interface CreatedOwnedVault {
  initializedCustody: InitializedVaultCustody;
  core: VaultCore;
  vault: VaultService;
}

export interface RecoverVaultOptions extends Omit<CreatePersistentVaultCoreDependenciesOptions, "vaultWorkingKey"> {
  vaultRecoveryKey: string;
  custodyStorageKey?: string;
  vault?: {
    customFlows?: VaultCustomFlowResolver;
    fetchImpl?: typeof fetch;
  };
}

export interface RecoveredVault {
  vaultWorkingKey: string;
  core: VaultCore;
  vault: VaultService;
}

export async function createOwnedVault(
  storage: IStorageProvider,
  options: CreateOwnedVaultOptions,
): Promise<CreatedOwnedVault> {
  const initializedCustody = await initializeVaultCustody(storage, options.custody);
  const deps = createPersistentVaultCoreDependencies(storage, {
    ...options,
    vaultWorkingKey: initializedCustody.vaultWorkingKey,
  });
  const core = createVaultCore(deps);
  await core.bootstrapOwnerIdentity(options.bootstrapOwner);
  return {
    initializedCustody,
    core,
    vault: wrapVaultCoreAsVaultService(core, options.vault),
  };
}

export async function recoverVault(
  storage: IStorageProvider,
  options: RecoverVaultOptions,
): Promise<RecoveredVault> {
  const vaultWorkingKey = await recoverVaultWorkingKey(
    storage,
    options.vaultRecoveryKey,
    options.custodyStorageKey,
  );
  const deps = createPersistentVaultCoreDependencies(storage, {
    ...options,
    vaultWorkingKey,
  });
  const core = createVaultCore(deps);
  return {
    vaultWorkingKey,
    core,
    vault: wrapVaultCoreAsVaultService(core, options.vault),
  };
}
