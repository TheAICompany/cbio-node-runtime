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
  ownerIdentity: CreatedIdentity;
  vault?: {
    customFlows?: VaultCustomFlowResolver;
    fetchImpl?: typeof fetch;
  };
}

export interface CreatedVault {
  core: VaultCore;
  vault: VaultService;
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
}

export async function createVault(
  storage: IStorageProvider,
  options: CreateVaultOptions,
): Promise<CreatedVault> {
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
  return {
    core,
    vault: wrapVaultCoreAsVaultService(core, options.vault),
  };
}

export async function recoverVault(
  storage: IStorageProvider,
  options: RecoverVaultOptions,
): Promise<RecoveredVault> {
  const vaultWorkingKey = deriveVaultWorkingKey(options.ownerIdentity.privateKey, options.vaultId);
  const deps = createPersistentVaultCoreDependencies(storage, {
    ...options,
    vaultId: options.vaultId,
    vaultWorkingKey,
  });
  const core = createVaultCore(deps);
  return {
    core,
    vault: wrapVaultCoreAsVaultService(core, options.vault),
  };
}
