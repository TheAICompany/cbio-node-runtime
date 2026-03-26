import type { Clock } from "../vault-core/index.js";
import type {
  CreateVaultClientOptions,
  VaultClient,
  VaultIdentity,
  VaultSigner,
} from "../clients/owner/client.js";
import type {
  OwnerSensitiveActionConfirmation,
  OwnerSensitiveActionContext,
} from "../clients/owner/contracts.js";
import { createVaultClient } from "../clients/owner/client.js";
import { FsStorageProvider } from "../storage/fs.js";
import type { IStorageProvider } from "../storage/provider.js";
import type { CreatedIdentity } from "./identity.js";
import { recoverVault, type RecoverVaultOptions, type RecoveredVault } from "./bootstrap.js";
import { createWorkspaceStorage } from "./workspace-storage.js";

export interface OwnerSession {
  readonly vaultId: string;
  readonly storage: IStorageProvider;
  readonly nickname?: string;
  isValid(): boolean;
  invalidate(): void;
  refresh(): Promise<RecoveredVault>;
  vault(): Promise<RecoveredVault>;
  client(): Promise<VaultClient>;
  withClient<T>(callback: (client: VaultClient, vault: RecoveredVault) => Promise<T> | T): Promise<T>;
}

export interface CreateOwnerSessionOptions extends RecoverVaultOptions {
  ownerIdentity?: CreatedIdentity | VaultIdentity;
  signer?: VaultSigner;
  clock?: Clock;
  skipWarmup?: boolean;
  sensitiveActionVerifier?: (
    confirmation: OwnerSensitiveActionConfirmation,
    context: OwnerSensitiveActionContext,
  ) => Promise<boolean> | boolean;
}

class DefaultOwnerSession implements OwnerSession {
  private _invalidated = false;
  private _cachedVaultPromise: Promise<RecoveredVault> | undefined;
  private _nickname: string | undefined;

  constructor(
    readonly storage: IStorageProvider,
    private readonly _options: CreateOwnerSessionOptions,
  ) {}

  get vaultId(): string {
    return this._options.vaultId;
  }

  get nickname(): string | undefined {
    return this._nickname;
  }

  isValid(): boolean {
    return !this._invalidated;
  }

  invalidate(): void {
    this._invalidated = true;
    this._cachedVaultPromise = undefined;
  }

  async refresh(): Promise<RecoveredVault> {
    this._assertValid();
    this._cachedVaultPromise = undefined;
    return this.vault();
  }

  async vault(): Promise<RecoveredVault> {
    this._assertValid();
    if (!this._cachedVaultPromise) {
      this._cachedVaultPromise = recoverVault(this.storage, this._options).then((vault) => {
        this._nickname = vault.nickname;
        return vault;
      });
    }
    return this._cachedVaultPromise;
  }

  async client(): Promise<VaultClient> {
    const vault = await this.vault();
    this._assertValid();
    return this._createClient(vault);
  }

  async withClient<T>(callback: (client: VaultClient, vault: RecoveredVault) => Promise<T> | T): Promise<T> {
    const vault = await this.vault();
    this._assertValid();
    return callback(this._createClient(vault), vault);
  }

  private _assertValid(): void {
    if (this._invalidated) {
      throw new Error(`OwnerSession for vault '${this._options.vaultId}' has been invalidated`);
    }
  }

  private _createClient(vault: RecoveredVault): VaultClient {
    const clientOptions: CreateVaultClientOptions = {
      vault: vault.vault,
      ownerIdentity: this._options.ownerIdentity,
      signer: this._options.signer,
      clock: this._options.clock,
      skipWarmup: this._options.skipWarmup,
      passwordVerifier: vault.verifyPassword,
      sensitiveActionVerifier: this._options.sensitiveActionVerifier,
    };
    return createVaultClient(clientOptions);
  }
}

function resolveOwnerSessionStorage(
  storageOrOptions: IStorageProvider | string | CreateOwnerSessionOptions,
  maybeOptions?: CreateOwnerSessionOptions,
): { storage: IStorageProvider; options: CreateOwnerSessionOptions } {
  if (maybeOptions) {
    return {
      storage: typeof storageOrOptions === "string"
        ? new FsStorageProvider(storageOrOptions)
        : storageOrOptions as IStorageProvider,
      options: maybeOptions,
    };
  }
  return {
    storage: createWorkspaceStorage(),
    options: storageOrOptions as CreateOwnerSessionOptions,
  };
}

export function createOwnerSession(
  storage: IStorageProvider | string,
  options: CreateOwnerSessionOptions,
): OwnerSession;
export function createOwnerSession(options: CreateOwnerSessionOptions): OwnerSession;
export function createOwnerSession(
  storageOrOptions: IStorageProvider | string | CreateOwnerSessionOptions,
  maybeOptions?: CreateOwnerSessionOptions,
): OwnerSession {
  const { storage, options } = resolveOwnerSessionStorage(storageOrOptions, maybeOptions);
  return new DefaultOwnerSession(storage, options);
}
