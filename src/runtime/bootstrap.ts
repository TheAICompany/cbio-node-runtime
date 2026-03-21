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
  type VaultCapabilityResolver,
  type VaultCustomFlowResolver,
} from "../vault-ingress/index.js";
import type { IStorageProvider } from "../storage/provider.js";

export interface InitializePersistentVaultOptions extends Omit<CreatePersistentVaultCoreDependenciesOptions, "vaultWorkingKey"> {
  custody?: InitializeVaultCustodyOptions;
  bootstrapOwner?: OwnerIdentityRecord;
  vault?: {
    capabilities?: VaultCapabilityResolver;
    customFlows?: VaultCustomFlowResolver;
    fetchImpl?: typeof fetch;
  };
}

export interface InitializedPersistentVault {
  initializedCustody: InitializedVaultCustody;
  core: VaultCore;
  vault: VaultService;
}

export interface RecoverPersistentVaultOptions extends Omit<CreatePersistentVaultCoreDependenciesOptions, "vaultWorkingKey"> {
  vaultRecoveryKey: string;
  custodyStorageKey?: string;
  vault?: {
    capabilities?: VaultCapabilityResolver;
    customFlows?: VaultCustomFlowResolver;
    fetchImpl?: typeof fetch;
  };
}

export interface RecoveredPersistentVault {
  vaultWorkingKey: string;
  core: VaultCore;
  vault: VaultService;
}

export async function initializePersistentVault(
  storage: IStorageProvider,
  options: InitializePersistentVaultOptions,
): Promise<InitializedPersistentVault> {
  const initializedCustody = await initializeVaultCustody(storage, options.custody);
  const deps = createPersistentVaultCoreDependencies(storage, {
    ...options,
    vaultWorkingKey: initializedCustody.vaultWorkingKey,
  });
  const core = createVaultCore(deps);
  if (options.bootstrapOwner) {
    await core.bootstrapOwnerIdentity(options.bootstrapOwner);
  }
  return {
    initializedCustody,
    core,
    vault: wrapVaultCoreAsVaultService(core, options.vault),
  };
}

export async function recoverPersistentVault(
  storage: IStorageProvider,
  options: RecoverPersistentVaultOptions,
): Promise<RecoveredPersistentVault> {
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
