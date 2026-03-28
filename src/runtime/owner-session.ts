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
  reloadVault(): Promise<RecoveredVault>;
  getVault(): Promise<RecoveredVault>;
  getOwnerClient(): Promise<OwnerClient>;
  withOwnerClient<T>(callback: (client: OwnerClient, vault: RecoveredVault) => Promise<T> | T): Promise<T>;
}

export interface OpenOwnerSessionOptions extends RecoverVaultOptions {
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
  private _cachedOwnerClientPromise: Promise<OwnerClient> | undefined;
  private _nickname: string | undefined;

  constructor(
    readonly storage: IStorageProvider,
    private readonly _options: OpenOwnerSessionOptions,
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
    this._cachedOwnerClientPromise = undefined;
  }

  async reloadVault(): Promise<RecoveredVault> {
    this._assertValid();
    this._cachedVaultPromise = undefined;
    this._cachedOwnerClientPromise = undefined;
    return this.getVault();
  }

  async getVault(): Promise<RecoveredVault> {
    this._assertValid();
    if (!this._cachedVaultPromise) {
      this._cachedVaultPromise = recoverVault(this.storage, this._options).then((vault) => {
        this._nickname = vault.nickname;
        return vault;
      });
    }
    return this._cachedVaultPromise;
  }

  async getOwnerClient(): Promise<OwnerClient> {
    this._assertValid();
    if (!this._cachedOwnerClientPromise) {
      this._cachedOwnerClientPromise = this.getVault().then((vault) => this._createClient(vault));
    }
    return this._cachedOwnerClientPromise;
  }

  async withOwnerClient<T>(callback: (client: OwnerClient, vault: RecoveredVault) => Promise<T> | T): Promise<T> {
    const vault = await this.getVault();
    this._assertValid();
    return callback(await this.getOwnerClient(), vault);
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
  storageOrOptions: IStorageProvider | string | OpenOwnerSessionOptions,
  maybeOptions?: OpenOwnerSessionOptions,
): { storage: IStorageProvider; options: OpenOwnerSessionOptions } {
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
    options: storageOrOptions as OpenOwnerSessionOptions,
  };
}

export function openOwnerSession(
  storage: IStorageProvider | string,
  options: OpenOwnerSessionOptions,
): OwnerSession;
export function openOwnerSession(options: OpenOwnerSessionOptions): OwnerSession;
export function openOwnerSession(
  storageOrOptions: IStorageProvider | string | OpenOwnerSessionOptions,
  maybeOptions?: OpenOwnerSessionOptions,
): OwnerSession {
  const { storage, options } = resolveOwnerSessionStorage(storageOrOptions, maybeOptions);
  return new DefaultOwnerSession(storage, options);
}
