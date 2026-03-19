/**
 * ActivityLog
 *
 * Audit log for fetchWithAuth/fetchAndAddSecret/fetchAndUpdateSecret. Separate from vault.
 * No sensitive data. For dashboard/UI display. Optional, can be disabled.
 * First line is metadata (_meta) for consumer identification.
 */
import type { IStorageProvider } from '../storage/provider.js';
export interface ActivityLogMetadata {
    v: number;
    agentId: string;
    vaultPath: string;
}
export interface ActivityLogEntry {
    ts: number;
    action: 'fetchWithAuth' | 'fetchAndAddSecret' | 'fetchAndUpdateSecret' | 'fetchAndStoreSecret';
    secretName: string;
    url?: string;
    method?: string;
    success?: boolean;
    error?: string;
}
export declare function appendActivityLog(storage: IStorageProvider, key: string, entry: ActivityLogEntry, metadata?: ActivityLogMetadata): Promise<void>;
export declare function readActivityLog(storage: IStorageProvider, key: string): Promise<ActivityLogEntry[]>;
export declare function readActivityLogMetadata(storage: IStorageProvider, key: string): Promise<ActivityLogMetadata | null>;
