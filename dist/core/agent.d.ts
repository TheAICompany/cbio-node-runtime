import { Signer, KeyPair } from './crypto.js';
import { CbioVault, type MergeResult, type SecretPolicy } from './vault.js';
import { AuthClient, type FetchWithAuthOptions } from './authClient.js';
import { SecretAcquisition, type FetchAndAddSecretOptions, type FetchAndUpdateSecretOptions, type FetchResult } from './secretAcquisition.js';
import type { ActivityLogEntry, ActivityLogMetadata } from '../activity/ActivityLog.js';
import { type IssuedAgentIdentity } from '@the-ai-company/cbio-protocol';
import type { IStorageProvider } from '../storage/provider.js';
export { CHILD_KEY_PREFIX, getChildIdentitySecretName } from './identity.js';
export interface ManagedAgentRecord {
    agentId: string;
    publicKey: string;
    privateKey: string;
    issuedIdentity: IssuedAgentIdentity;
}
/**
 * Valid permission strings for a CbioAgent handle.
 */
export type AgentPermissionName = 'vault:list' | 'vault:fetch' | 'vault:acquire' | 'admin:secrets' | 'admin:issue' | 'identity:sign';
/**
 * Granular permissions for a CbioAgent handle.
 * These are runtime switches that control access to specific facets.
 */
export type AgentPermissions = Partial<Record<AgentPermissionName, boolean>>;
/**
 * CbioIdentity
 *
 * The primary Identity container. Represents an agent's identity and its associated vault.
 * This is the high-privilege handle that contains administrative capabilities (.admin)
 * and private keys.
 */
export declare class CbioIdentity {
    #private;
    readonly signer: Signer;
    private readonly _vault;
    readonly admin: CbioManagementFacet;
    readonly agentId: string;
    readonly publicKey: string;
    private readonly _authClient;
    private readonly _secretAcquisition;
    constructor(signer: Signer, _vault: CbioVault, agentId?: string, publicKey?: string);
    /**
     * Primary entry point: Load identity from keys and initialize vault.
     */
    static load(keys: KeyPair, options?: {
        vaultPath?: string;
        storage?: IStorageProvider;
        storageKey?: string;
        activityLogKey?: string | null;
    }): Promise<CbioIdentity>;
    fetchWithAuth(secretName: string, url: string, options?: FetchWithAuthOptions): Promise<Response>;
    createFetchWithAuth(secretName: string): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    getPublicKey(): Promise<string>;
    getAgentId(): Promise<string>;
    fetchAndAddSecret(options: FetchAndAddSecretOptions): Promise<FetchResult>;
    fetchAndUpdateSecret(options: FetchAndUpdateSecretOptions): Promise<FetchResult>;
    hasSecret(secretName: string): boolean;
    listSecretNames(): string[];
    /**
     * Register a newly created child identity to the parent vault.
     */
    registerChildIdentity(keys: KeyPair, options?: {
        capabilities?: AgentPermissionName[];
    }): Promise<string>;
    authenticate(nonce: string): Promise<string>;
    /**
     * Create a standard Agent handle for this identity.
     * The Agent handle DOES NOT have an .admin property and does not expose the signer/private key.
     * This is the recommended handle to pass to an autonomous LLM.
     *
     * @param permissions Optional granular permissions to grant to this handle.
     *                    If not provided, it attempts to auto-derive permissions from the
     *                    identity's protocol-level capabilities (if available),
     *                    otherwise defaults to restricted access (vault:fetch, vault:list).
     */
    getAgent(permissions?: AgentPermissions): CbioAgent;
    /**
     * @internal
     * Set the protocol-level identity certificate for this identity.
     */
    setIssuedIdentity(identity: IssuedAgentIdentity): void;
}
/**
 * CbioAgent
 *
 * A safety-wrapped version of an Identity designed for autonomous LLMs.
 * It provides only the Standard facet (fetchWithAuth, etc.) by default and hides
 * all administrative capabilities and private keys.
 */
export declare class CbioAgent {
    #private;
    readonly agentId: string;
    readonly publicKey: string;
    constructor(authClient: AuthClient, secretAcquisition: SecretAcquisition, agentId: string, publicKey: string, permissions?: AgentPermissions);
    /**
     * View the runtime permissions granted to this handle.
     */
    get permissions(): Readonly<AgentPermissions>;
    private _checkPermission;
    fetchWithAuth(secretName: string, url: string, options?: FetchWithAuthOptions): Promise<Response>;
    createFetchWithAuth(secretName: string): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    getPublicKey(): Promise<string>;
    getAgentId(): Promise<string>;
    fetchAndAddSecret(options: FetchAndAddSecretOptions): Promise<FetchResult>;
    fetchAndUpdateSecret(options: FetchAndUpdateSecretOptions): Promise<FetchResult>;
    hasSecret(secretName: string): boolean;
    listSecretNames(): string[];
    /**
     * Check if this agent handle has the specified runtime permission.
     */
    can(permission: AgentPermissionName): boolean;
}
export interface ManagedAgentContext {
    agentId: string;
    publicKey: string;
    secretName: string;
    agent: CbioAgent;
}
export interface ManagedAgentOptions {
    keys?: KeyPair;
    secretName?: string;
    capabilities?: AgentPermissionName[];
    agentPermissions?: AgentPermissions;
    storage?: IStorageProvider;
    storageKey?: string;
    activityLogKey?: string | null;
}
/**
 * CbioManagementFacet
 *
 * Provides administrative (high-risk) capabilities for a CbioIdentity.
 */
export declare class CbioManagementFacet {
    private readonly _identity;
    private readonly _vault;
    constructor(_identity: CbioIdentity, _vault: CbioVault);
    addSecret(secretName: string, secretValue: string, options?: SecretPolicy): Promise<void>;
    getSecret(secretName: string): string | undefined;
    /**
     * Get the protocol-level capabilities granted to a managed agent.
     * Includes a check for revocation.
     */
    getManagedAgentCapabilities(publicKey: string): string[];
    /**
     * Revoke a managed agent by issuing a protocol-level revocation record.
     */
    revokeManagedAgent(publicKey: string, reason?: string): Promise<void>;
    hasSecret(secretName: string): boolean;
    deleteSecret(secretName: string): Promise<void>;
    setSecretAllowedOrigins(secretName: string, allowedOrigins: readonly string[]): Promise<void>;
    getActivityLog(): Promise<readonly ActivityLogEntry[]>;
    getActivityLogMetadata(): Promise<ActivityLogMetadata | null>;
    mergeFrom(otherIdentity: CbioIdentity, options?: {
        onConflict?: 'abort' | 'skip' | 'overwrite';
    }): Promise<MergeResult>;
    seal(kdk: string): string;
    loadFromSealedBlob(kdk: string, sealedBlob: string): void;
    serializeToBlob(): Promise<string>;
    saveVault(path?: string): Promise<void>;
    issueManagedAgent(options?: ManagedAgentOptions): Promise<ManagedAgentContext>;
    loadManagedAgent(publicKey: string, options?: Omit<ManagedAgentOptions, 'keys' | 'secretName'>): Promise<ManagedAgentContext>;
    registerChildIdentity(keys: KeyPair, options?: {
        capabilities?: AgentPermissionName[];
    }): Promise<string>;
}
