import { Signer } from './crypto.js';
import type { IStorageProvider } from '../storage/provider.js';
import { type ActivityLogEntry, type ActivityLogMetadata } from '../activity/ActivityLog.js';
export interface SecretPolicy {
    allowedOrigins?: string[];
}
/**
 * CbioVault
 *
 * A secure container for third-party API keys and secrets.
 * Secrets are stored in a private field (#) and are inaccessible
 * to the outside Agent logic. Vault stores ONLY secrets (encrypted).
 */
export declare class CbioVault {
    #private;
    private static readonly PERSIST_SALT;
    private static readonly VERSIONED_SECRET_PREFIX;
    /**
     * @internal Used by Owner. Binds storage and loads vault from disk. Do not call directly.
     */
    initFromStorage(signer: Signer, storageKey: string, storage?: IStorageProvider, activityLogKey?: string): Promise<void>;
    /**
     * @internal Used by Owner.importIdentity. Binds storage and loads vault from blob. Do not call directly.
     */
    initFromBlob(signer: Signer, blob: string, storageKey: string, storage?: IStorageProvider, activityLogKey?: string): Promise<void>;
    /**
     * Add a new secret. Fails if secretName already exists.
     */
    addSecret(secretName: string, secretValue: string, options?: SecretPolicy): Promise<void>;
    /**
     * Update an existing secret. Fails if secretName does not exist.
     */
    updateSecret(secretName: string, secretValue: string): Promise<void>;
    setSecretAllowedOrigins(secretName: string, allowedOrigins: readonly string[]): Promise<void>;
    rotateSecret(secretName: string, secretValue: string, sourceOrigin: string): Promise<void>;
    /**
     * Case 3: Retrieve a secret in plaintext.
     * @internal @admin
     * WARNING: This is an ADMIN-ONLY method. Do not use in Agent's autonomous logic.
     */
    getSecret(secretName: string): string | undefined;
    /**
     * Case 4: Permanently delete a secret from memory and disk.
     * @internal @admin
     * WARNING: This is an ADMIN-ONLY method. Agent should NEVER be allowed
     * to delete its own memory autonomously. Only Owner (Human) can call this.
     */
    deleteSecret(secretName: string): Promise<void>;
    /**
     * @internal Used by AuthClient to append activity log entries.
     */
    appendActivityLogEntry(entry: ActivityLogEntry): Promise<void>;
    /**
     * Persistence: Atomic save with write-read-verify.
     */
    save(signer: Signer, storageKeyOrPath: string, storage?: IStorageProvider): Promise<void>;
    serializeToBlob(signer: Signer): Promise<string>;
    /**
     * Seal vault with external key (AES-256-GCM) for portable local storage.
     */
    seal(kdk: string): string;
    /**
     * Unseal vault from blob encrypted with kdk.
     */
    unseal(kdk: string, sealed: string): void;
    hasSecret(secretName: string): boolean;
    listSecretNames(): string[];
    /**
     * Read activity log. Owner-only. Returns [] if activity log not enabled.
     */
    getActivityLog(): Promise<readonly ActivityLogEntry[]>;
    /**
     * Read activity log metadata (agentId, vaultPath). Returns null if not present.
     */
    getActivityLogMetadata(): Promise<ActivityLogMetadata | null>;
    /**
     * Merge secrets from another vault instance.
     * Only allowed if both vaults belong to the same identity.
     * @param options.onConflict 'abort' = return conflicts (default); 'skip' = merge non-conflicting only; 'overwrite' = use other's value for conflicts.
     */
    mergeFrom(otherVault: CbioVault, options?: {
        onConflict?: 'abort' | 'skip' | 'overwrite';
    }): Promise<MergeResult>;
}
export interface MergeResult {
    merged: boolean;
    conflicts?: string[];
}
