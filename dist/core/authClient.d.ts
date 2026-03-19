/**
 * AuthClient
 *
 * Runtime HTTP client that uses vault-stored secrets for Authorization.
 * Handles fetchWithAuth and createFetchWithAuth. Vault only does storage.
 */
import { Signer } from './crypto.js';
import type { CbioVault } from './vault.js';
import type { ActivityLogEntry } from '../activity/ActivityLog.js';
export interface FetchWithAuthOptions extends RequestInit {
    authPrefix?: string;
    authHeaderName?: string;
    withSignature?: boolean;
}
/**
 * AuthClient uses vault's secrets for authenticated HTTP requests.
 * Secret values never leave the vault; AuthClient reads via vault.getSecret.
 */
export declare class AuthClient {
    private readonly _vault;
    private readonly _signer;
    private readonly _appendActivityLog;
    constructor(_vault: CbioVault, _signer: Signer | null, _appendActivityLog: (entry: ActivityLogEntry) => Promise<void>);
    fetchWithAuth(secretName: string, url: string, options?: FetchWithAuthOptions): Promise<Response>;
    createFetchWithAuth(secretName: string): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}
