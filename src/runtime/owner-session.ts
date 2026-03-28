import type { Clock } from "../vault-core/index.js";
import type {
  OwnerClient,
  CreateOwnerClientOptions,
  OwnerSensitiveActionConfirmation,
  OwnerSensitiveActionContext,
} from "../clients/owner/contracts.js";
import { createOwnerClient } from "../clients/owner/client.js";
import { FsStorageProvider } from "../storage/fs.js";
import type { IStorageProvider } from "../storage/provider.js";
import type { CreatedIdentity } from "./identity.js";
import { recoverVault, type RecoverVaultOptions, type RecoveredVault } from "./bootstrap.js";
import { createWorkspaceStorage } from "./workspace-storage.js";

export interface OwnerSession {
  readonly vault_id: string;
  readonly storage: IStorageProvider;
  readonly nickname?: string;
  isValid(): boolean;
  invalidate(): void;
  refresh(): Promise<RecoveredVault>;
  vault(): Promise<RecoveredVault>;
  client(): Promise<OwnerClient>;
  withClient<T>(callback: (client: OwnerClient, vault: RecoveredVault) => Promise<T> | T): Promise<T>;
}

export interface CreateOwnerSessionOptions extends RecoverVaultOptions {
  signer?: any;
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

  get vault_id(): string {
    return this._options.vault_id;
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

  async client(): Promise<OwnerClient> {
    const vault = await this.vault();
    this._assertValid();
    return await this._createClient(vault);
  }

  async withClient<T>(callback: (client: OwnerClient, vault: RecoveredVault) => Promise<T> | T): Promise<T> {
    const vault = await this.vault();
    this._assertValid();
    return callback(await this._createClient(vault), vault);
  }

  private _assertValid(): void {
    if (this._invalidated) {
      throw new Error(`OwnerSession for vault '${this._options.vault_id}' has been invalidated`);
    }
  }

  private async _createClient(vault: RecoveredVault): Promise<OwnerClient> {
    const clientOptions: CreateOwnerClientOptions = {
      vault: vault.vault,
      clock: this._options.clock,
      skipWarmup: this._options.skipWarmup,
      password_verifier: vault.verifyPassword,
      sensitiveActionVerifier: this._options.sensitiveActionVerifier,
    };
    return await createOwnerClient(clientOptions);
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
