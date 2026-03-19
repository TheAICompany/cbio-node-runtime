/**
 * SecretAcquisition
 *
 * Fetches secrets from remote URLs and stores them in vault.
 * Secret never leaves this module; fetch + extract + store is atomic.
 */
import type { CbioVault } from './vault.js';
import type { ActivityLogEntry } from '../activity/ActivityLog.js';
export interface FetchResult {
    success: boolean;
    data?: any;
    secretName?: string;
    error?: string;
    code?: string;
    /** True when the operation succeeded/failed but activity log write failed. Caller gets FetchResult; audit trail may be incomplete. */
    activityLogWriteFailed?: boolean;
}
export interface FetchAndAddSecretOptions {
    secretName: string;
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    extractKey: (response: any) => string;
    allowedOrigins?: string[];
}
export interface FetchAndUpdateSecretOptions {
    secretName: string;
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    extractKey: (response: any) => string;
}
export declare class SecretAcquisition {
    private readonly _vault;
    private readonly _appendActivityLog;
    constructor(_vault: CbioVault, _appendActivityLog: (entry: ActivityLogEntry) => Promise<void>);
    fetchAndAddSecret(options: FetchAndAddSecretOptions): Promise<FetchResult>;
    fetchAndUpdateSecret(options: FetchAndUpdateSecretOptions): Promise<FetchResult>;
}
