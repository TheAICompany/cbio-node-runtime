import { Buffer } from 'node:buffer';
import * as crypto from 'node:crypto';
import { Signer } from './crypto.js';
import { deriveRootAgentId } from './identity.js';
import { IdentityError, IdentityErrorCode } from '../errors.js';
import type { IStorageProvider } from '../storage/provider.js';
import { FsStorageProvider } from '../storage/fs.js';
import {
    appendActivityLog,
    readActivityLog,
    readActivityLogMetadata,
    type ActivityLogEntry,
    type ActivityLogMetadata,
} from '../activity/ActivityLog.js';
import { sealBlob, unsealBlob } from '../migration/seal.js';

const VAULT_FORMAT_VERSION = "v1.0";
const SUPPORTED_VERSIONS = ["v1.0"];

function normalizeOriginForSecretPolicy(origin: string): string {
    const url = new URL(origin);
    const isLoopbackHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
    if (url.protocol === 'https:') {
        return url.origin;
    }
    if (url.protocol === 'http:' && isLoopbackHost) {
        return url.origin;
    }
    throw new IdentityError(IdentityErrorCode.SECRET_POLICY_REQUIRED, `Secret policy requires HTTPS origin or loopback HTTP for local development. Received: ${origin}`);
}

export interface SecretPolicy {
    allowedOrigins?: string[];
}

type SecretVersionState = 'active' | 'deprecated';

interface SecretVersionRecord {
    storageKey: string;
    state: SecretVersionState;
    createdAt: number;
    sourceOrigin?: string;
}

interface SecretRecordMetadata {
    activeVersion: string;
    nextVersionNumber: number;
    versions: Record<string, SecretVersionRecord>;
    allowedOrigins?: string[];
}

/**
 * CbioVault
 *
 * A secure container for third-party API keys and secrets.
 * Secrets are stored in a private field (#) and are inaccessible
 * to the outside Agent logic. Vault stores ONLY secrets (encrypted).
 */
export class CbioVault {
    #secrets: Map<string, string> = new Map();
    #secretMetadata: Map<string, SecretRecordMetadata> = new Map();
    #autoSigner: Signer | null = null;
    #storage: IStorageProvider | null = null;
    #storageKey: string | null = null;
    #activityLogKey: string | null = null;
    #identityFingerprint: string | null = null;
    private static readonly PERSIST_SALT = "CBIO_VAULT_PERSIST_V1";
    private static readonly VERSIONED_SECRET_PREFIX = "__cbio_secret_version__:";

    static #isVersionStorageKey(secretName: string): boolean {
        return secretName.startsWith(CbioVault.VERSIONED_SECRET_PREFIX);
    }

    static #normalizeAllowedOrigins(allowedOrigins?: readonly string[]): string[] | undefined {
        if (!allowedOrigins || allowedOrigins.length === 0) return undefined;
        const normalized = Array.from(new Set(allowedOrigins.map((origin) => normalizeOriginForSecretPolicy(origin))));
        return normalized.length > 0 ? normalized : undefined;
    }

    #makeVersionStorageKey(secretName: string, versionId: string): string {
        return `${CbioVault.VERSIONED_SECRET_PREFIX}${secretName}:${versionId}`;
    }

    #assertPublicSecretName(secretName: string): void {
        if (CbioVault.#isVersionStorageKey(secretName)) {
            throw new IdentityError(IdentityErrorCode.SECRET_NOT_FOUND, `Secret name '${secretName}' is reserved for internal version storage.`);
        }
    }

    #createVersionedSecret(secretName: string, secretValue: string, options?: { allowedOrigins?: readonly string[]; sourceOrigin?: string }): void {
        const versionId = 'v1';
        const storageKey = this.#makeVersionStorageKey(secretName, versionId);
        this.#secrets.set(storageKey, secretValue);
        this.#secretMetadata.set(secretName, {
            activeVersion: versionId,
            nextVersionNumber: 2,
            versions: {
                [versionId]: {
                    storageKey,
                    state: 'active',
                    createdAt: Date.now(),
                    ...(options?.sourceOrigin && { sourceOrigin: options.sourceOrigin }),
                }
            },
            ...(options?.allowedOrigins && { allowedOrigins: CbioVault.#normalizeAllowedOrigins(options.allowedOrigins) }),
        });
    }

    #ensureVersionedSecret(secretName: string): SecretRecordMetadata {
        const existing = this.#secretMetadata.get(secretName);
        if (existing) return existing;

        const legacyValue = this.#secrets.get(secretName);
        if (legacyValue === undefined) {
            throw new IdentityError(IdentityErrorCode.SECRET_NOT_FOUND, `Secret name '${secretName}' not found. Use addSecret to add.`);
        }

        this.#secrets.delete(secretName);
        this.#createVersionedSecret(secretName, legacyValue);
        return this.#secretMetadata.get(secretName)!;
    }

    #getActiveVersionValue(secretName: string): string | undefined {
        const metadata = this.#secretMetadata.get(secretName);
        if (!metadata) return this.#secrets.get(secretName);
        const active = metadata.versions[metadata.activeVersion];
        return active ? this.#secrets.get(active.storageKey) : undefined;
    }

    /**
     * @internal Used by Owner. Binds storage and loads vault from disk. Do not call directly.
     */
    async initFromStorage(
        signer: Signer,
        storageKey: string,
        storage?: IStorageProvider,
        activityLogKey?: string
    ): Promise<void> {
        await this.#setupAutoSave(signer, storageKey, storage, activityLogKey);
        await this.#load(signer, storageKey, storage);
    }

    /**
     * @internal Used by Owner.importIdentity. Binds storage and loads vault from blob. Do not call directly.
     */
    async initFromBlob(
        signer: Signer,
        blob: string,
        storageKey: string,
        storage?: IStorageProvider,
        activityLogKey?: string
    ): Promise<void> {
        await this.#setupAutoSave(signer, storageKey, storage, activityLogKey);
        await this.#deserializeFromBlob(signer, blob);
    }

    async #setupAutoSave(
        signer: Signer,
        storageKey: string,
        storage?: IStorageProvider,
        activityLogKey?: string
    ): Promise<void> {
        const provider = storage ?? new FsStorageProvider();
        const testKey = `${storageKey}.cbio_write_test_${crypto.randomBytes(4).toString('hex')}`;
        try {
            await provider.write(testKey, Buffer.from('test'));
            await provider.delete(testKey);
        } catch (e: any) {
            const msg = `CRITICAL: Vault persistence failed. Storage is not writable.\n` +
                        `Error: ${e.message}\n` +
                        `Solution: Check storage permissions or provide a custom IStorageProvider.`;
            throw new IdentityError(IdentityErrorCode.VAULT_PERSISTENCE_FAILED, msg, { cause: e });
        }

        this.#autoSigner = signer;
        this.#storage = provider;
        this.#storageKey = storageKey;
        this.#activityLogKey = activityLogKey ?? null;

        const publicKey = await signer.getPublicKey();
        this.#identityFingerprint = crypto.createHash('sha256').update(publicKey).digest('hex');
    }

    /**
     * Add a new secret. Fails if secretName already exists.
     */
    async addSecret(secretName: string, secretValue: string, options?: SecretPolicy): Promise<void> {
        this.#assertPublicSecretName(secretName);
        if (this.hasSecret(secretName)) {
            throw new IdentityError(IdentityErrorCode.SECRET_ALREADY_EXISTS, `Secret name '${secretName}' already exists. Use updateSecret to overwrite.`);
        }
        this.#createVersionedSecret(secretName, secretValue, { allowedOrigins: options?.allowedOrigins });
        await this.#persistIfPossible();
    }

    /**
     * Update an existing secret. Fails if secretName does not exist.
     */
    async updateSecret(secretName: string, secretValue: string): Promise<void> {
        this.#assertPublicSecretName(secretName);
        const metadata = this.#secretMetadata.get(secretName);
        if (metadata) {
            const active = metadata.versions[metadata.activeVersion];
            if (!active) {
                throw new IdentityError(IdentityErrorCode.SECRET_NOT_FOUND, `Secret name '${secretName}' has no active version.`);
            }
            this.#secrets.set(active.storageKey, secretValue);
        } else if (this.#secrets.has(secretName)) {
            this.#secrets.set(secretName, secretValue);
        } else {
            throw new IdentityError(IdentityErrorCode.SECRET_NOT_FOUND, `Secret name '${secretName}' not found. Use addSecret to add.`);
        }
        await this.#persistIfPossible();
    }

    async setSecretAllowedOrigins(secretName: string, allowedOrigins: readonly string[]): Promise<void> {
        this.#assertPublicSecretName(secretName);
        const metadata = this.#ensureVersionedSecret(secretName);
        metadata.allowedOrigins = CbioVault.#normalizeAllowedOrigins(allowedOrigins);
        await this.#persistIfPossible();
    }

    async rotateSecret(secretName: string, secretValue: string, sourceOrigin: string): Promise<void> {
        this.#assertPublicSecretName(secretName);
        const metadata = this.#ensureVersionedSecret(secretName);
        const allowedOrigins = metadata.allowedOrigins;
        if (!allowedOrigins || allowedOrigins.length === 0) {
            throw new IdentityError(
                IdentityErrorCode.SECRET_POLICY_REQUIRED,
                `Secret '${secretName}' cannot be rotated by agent until owner sets allowedOrigins.`
            );
        }
        const normalizedOrigin = new URL(sourceOrigin).origin;
        if (!allowedOrigins.includes(normalizedOrigin)) {
            throw new IdentityError(
                IdentityErrorCode.SECRET_SOURCE_ORIGIN_MISMATCH,
                `Secret '${secretName}' only allows rotation from ${allowedOrigins.join(', ')}. Received: ${normalizedOrigin}`
            );
        }

        const current = metadata.versions[metadata.activeVersion];
        if (current) current.state = 'deprecated';

        const versionId = `v${metadata.nextVersionNumber}`;
        metadata.nextVersionNumber += 1;
        const storageKey = this.#makeVersionStorageKey(secretName, versionId);
        this.#secrets.set(storageKey, secretValue);
        metadata.versions[versionId] = {
            storageKey,
            state: 'active',
            createdAt: Date.now(),
            sourceOrigin: normalizedOrigin,
        };
        metadata.activeVersion = versionId;
        await this.#persistIfPossible();
    }

    /**
     * Case 3: Retrieve a secret in plaintext.
     * @internal @admin
     * WARNING: This is an ADMIN-ONLY method. Do not use in Agent's autonomous logic.
     */
    getSecret(secretName: string): string | undefined {
        if (CbioVault.#isVersionStorageKey(secretName)) return undefined;
        return this.#getActiveVersionValue(secretName);
    }

    /**
     * Case 4: Permanently delete a secret from memory and disk.
     * @internal @admin
     * WARNING: This is an ADMIN-ONLY method. Agent should NEVER be allowed
     * to delete its own memory autonomously. Only Owner (Human) can call this.
     */
    async deleteSecret(secretName: string): Promise<void> {
        this.#assertPublicSecretName(secretName);
        const metadata = this.#secretMetadata.get(secretName);
        if (metadata) {
            for (const version of Object.values(metadata.versions)) {
                this.#secrets.delete(version.storageKey);
            }
            this.#secretMetadata.delete(secretName);
        } else if (this.#secrets.has(secretName)) {
            this.#secrets.delete(secretName);
        } else {
            throw new IdentityError(IdentityErrorCode.SECRET_NOT_FOUND, `Secret name '${secretName}' not found. Nothing to delete.`);
        }
        await this.#persistIfPossible();
    }

    async #appendActivityLog(entry: ActivityLogEntry): Promise<void> {
        if (!this.#storage || !this.#activityLogKey || !this.#autoSigner || !this.#storageKey) return;
        const metadata = {
            v: 1,
            agentId: deriveRootAgentId(await this.#autoSigner.getPublicKey()),
            vaultPath: this.#storageKey,
        };
        await appendActivityLog(this.#storage, this.#activityLogKey, entry, metadata);
    }

    /**
     * @internal Used by AuthClient to append activity log entries.
     */
    async appendActivityLogEntry(entry: ActivityLogEntry): Promise<void> {
        await this.#appendActivityLog(entry);
    }

    /**
     * Persistence: Atomic save with write-read-verify.
     */
    async save(signer: Signer, storageKeyOrPath: string, storage?: IStorageProvider): Promise<void> {
        const provider = storage ?? this.#storage ?? new FsStorageProvider();
        const key = storageKeyOrPath;
        const tmpKey = `${key}.tmp`;

        const bundle = await this.#serializeToBundle(signer);
        const checksum = crypto.createHash('sha256').update(bundle).digest('hex');

        await provider.write(tmpKey, bundle);
        const readBack = await provider.read(tmpKey);
        if (!readBack) {
            throw new IdentityError(
                IdentityErrorCode.VAULT_WRITE_INTEGRITY_FAILED,
                `Vault write integrity failure: could not read back ${tmpKey}`
            );
        }
        const readChecksum = crypto.createHash('sha256').update(readBack).digest('hex');
        if (readChecksum !== checksum) {
            throw new IdentityError(
                IdentityErrorCode.VAULT_WRITE_INTEGRITY_FAILED,
                `Vault write integrity failure: checksum mismatch. Do not delete ${tmpKey} for forensic analysis.`
            );
        }

        if (provider.rename) {
            await provider.rename(tmpKey, key);
        } else {
            await provider.write(key, bundle);
            await provider.delete(tmpKey);
        }
    }

    async serializeToBlob(signer: Signer): Promise<string> {
        const bundle = await this.#serializeToBundle(signer);
        return bundle.toString('base64url');
    }

    /**
     * Seal vault with external key (AES-256-GCM) for portable local storage.
     */
    seal(kdk: string): string {
        try {
            return sealBlob({
                version: VAULT_FORMAT_VERSION,
                secrets: Object.fromEntries(this.#secrets),
                secretMetadata: Object.fromEntries(this.#secretMetadata),
            }, kdk);
        } catch (e: any) {
            if (e.code === IdentityErrorCode.INVALID_KDK) throw e;
            throw new IdentityError(IdentityErrorCode.INVALID_KDK, "seal: " + (e.message || String(e)), { cause: e });
        }
    }

    /**
     * Unseal vault from blob encrypted with kdk.
     */
    unseal(kdk: string, sealed: string): void {
        try {
            const data = unsealBlob(sealed, kdk);
            this.#loadFromPayload(data);
        } catch (e: any) {
            if (e instanceof IdentityError) throw e;
            throw new IdentityError(IdentityErrorCode.INVALID_KDK, "unseal: " + (e.message || String(e)), { cause: e });
        }
    }

    async #serializeToBundle(signer: Signer): Promise<Buffer> {
        const signature = await signer.sign(CbioVault.PERSIST_SALT);
        const encryptionKey = crypto.createHash('sha256').update(signature).digest();
        const payload = {
            version: VAULT_FORMAT_VERSION,
            secrets: Object.fromEntries(this.#secrets),
            secretMetadata: Object.fromEntries(this.#secretMetadata),
        };
        const plainText = JSON.stringify(payload);
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
        const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([iv, tag, encrypted]);
    }

    #loadFromPayload(data: any): void {
        this.#secrets = new Map(Object.entries(data.secrets || data));
        this.#secretMetadata = new Map(Object.entries(data.secretMetadata || {}));
    }

    async #persistIfPossible(): Promise<void> {
        if (this.#autoSigner && this.#storage && this.#storageKey) {
            await this.save(this.#autoSigner, this.#storageKey, this.#storage);
        }
    }

    async #load(signer: Signer, storageKeyOrPath: string, storage?: IStorageProvider, mode: 'optional' | 'required' = 'optional'): Promise<void> {
        const provider = storage ?? this.#storage ?? new FsStorageProvider();
        const key = storageKeyOrPath;
        const tmpKey = `${key}.tmp`;

        const tryLoad = async (k: string): Promise<boolean> => {
            try {
                const bundle = await provider.read(k);
                if (!bundle) return false;
                await this.#deserializeFromBundle(signer, bundle);
                return true;
            } catch {
                return false;
            }
        };

        if (await tryLoad(key)) {
            await provider.delete(tmpKey).catch(() => {});
            return;
        }

        const mainMissing = !(await provider.has(key));
        if (mainMissing) {
            if (await tryLoad(tmpKey)) {
                if (provider.rename) {
                    await provider.rename(tmpKey, key);
                } else {
                    const bundle = await provider.read(tmpKey);
                    if (bundle) await provider.write(key, bundle);
                    await provider.delete(tmpKey);
                }
                return;
            }
            if (mode === 'required') {
                throw new IdentityError(IdentityErrorCode.VAULT_FILE_NOT_FOUND, `Vault file not found: ${key}`);
            }
            return;
        }

        if (await tryLoad(tmpKey)) {
            if (provider.rename) {
                await provider.rename(tmpKey, key);
            } else {
                const bundle = await provider.read(tmpKey);
                if (bundle) await provider.write(key, bundle);
                await provider.delete(tmpKey);
            }
            return;
        }

        // Path collision: main exists but decrypt failed. Try suffixed paths only if file looks valid (not obviously corrupt).
        const bundle = await provider.read(key);
        if (!bundle || bundle.length < 32) {
            throw new IdentityError(
                IdentityErrorCode.VAULT_CORRUPTED,
                `Vault corrupted: both ${key} and ${tmpKey} are unreadable. Do not overwrite. Seek recovery support.`
            );
        }
        const base = key.replace(/\.enc$/, '');
        for (let n = 1; n <= 100; n++) {
            const altKey = `${base}_${n}.enc`;
            if (await tryLoad(altKey)) {
                this.#storageKey = altKey;
                if (this.#activityLogKey) {
                    this.#activityLogKey = `${base}_${n}.activity.jsonl`;
                }
                return;
            }
        }

        throw new IdentityError(
            IdentityErrorCode.VAULT_DECRYPT_FAILED,
            `Vault decrypt failed: ${key} exists but could not be decrypted with this key. Wrong key, tampered file, or incompatible format. Do not overwrite. Seek recovery support.`
        );
    }

    async #deserializeFromBlob(signer: Signer, blob: string): Promise<void> {
        const bundle = Buffer.from(blob, 'base64url');
        await this.#deserializeFromBundle(signer, bundle);
    }

    async #deserializeFromBundle(signer: Signer, bundle: Buffer): Promise<void> {
        const signature = await signer.sign(CbioVault.PERSIST_SALT);
        const encryptionKey = crypto.createHash('sha256').update(signature).digest();
        const iv = bundle.subarray(0, 12);
        const tag = bundle.subarray(12, 28);
        const encrypted = bundle.subarray(28);
        const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
        decipher.setAuthTag(tag);
        const plainText = decipher.update(encrypted as any, undefined, 'utf8') + decipher.final('utf8');
        const data = JSON.parse(plainText);
        if (SUPPORTED_VERSIONS.includes(data.version)) {
            this.#loadFromPayload(data);
        } else {
            this.#secrets = new Map(Object.entries(data.secrets || data));
            this.#secretMetadata = new Map();
        }
    }

    hasSecret(secretName: string): boolean {
        if (CbioVault.#isVersionStorageKey(secretName)) return false;
        return this.#secretMetadata.has(secretName) || this.#secrets.has(secretName);
    }

    listSecretNames(): string[] {
        const names = new Set(this.#secretMetadata.keys());
        for (const secretName of this.#secrets.keys()) {
            if (!CbioVault.#isVersionStorageKey(secretName)) {
                names.add(secretName);
            }
        }
        return Array.from(names);
    }

    /**
     * Read activity log. Owner-only. Returns [] if activity log not enabled.
     */
    async getActivityLog(): Promise<readonly ActivityLogEntry[]> {
        if (!this.#storage || !this.#activityLogKey) return [];
        return await readActivityLog(this.#storage, this.#activityLogKey);
    }

    /**
     * Read activity log metadata (agentId, vaultPath). Returns null if not present.
     */
    async getActivityLogMetadata(): Promise<ActivityLogMetadata | null> {
        if (!this.#storage || !this.#activityLogKey) return null;
        return await readActivityLogMetadata(this.#storage, this.#activityLogKey);
    }

    /**
     * Merge secrets from another vault instance.
     * Only allowed if both vaults belong to the same identity.
     * @param options.onConflict 'abort' = return conflicts (default); 'skip' = merge non-conflicting only; 'overwrite' = use other's value for conflicts.
     */
    async mergeFrom(otherVault: CbioVault, options?: { onConflict?: 'abort' | 'skip' | 'overwrite' }): Promise<MergeResult> {
        const onConflict = options?.onConflict ?? 'abort';

        if (this.#identityFingerprint !== otherVault.#identityFingerprint) {
            throw new IdentityError(IdentityErrorCode.MERGE_IDENTITY_MISMATCH, "Cannot merge vaults belonging to different identities.");
        }

        const conflicts: string[] = [];
        for (const secretName of otherVault.listSecretNames()) {
            if (this.hasSecret(secretName)) conflicts.push(secretName);
        }

        if (conflicts.length > 0 && onConflict === 'abort') {
            return { merged: false, conflicts };
        }

        for (const secretName of otherVault.listSecretNames()) {
            const secretValue = otherVault.getSecret(secretName);
            if (secretValue === undefined) continue;
            const allowedOrigins = otherVault.#secretMetadata.get(secretName)?.allowedOrigins;
            if (!this.hasSecret(secretName)) {
                await this.addSecret(secretName, secretValue, { allowedOrigins });
            } else if (onConflict === 'overwrite') {
                await this.updateSecret(secretName, secretValue);
                if (allowedOrigins) {
                    await this.setSecretAllowedOrigins(secretName, allowedOrigins);
                }
            }
        }
        await this.#persistIfPossible();
        return { merged: true };
    }
}

export interface MergeResult {
    merged: boolean;
    conflicts?: string[];
}
