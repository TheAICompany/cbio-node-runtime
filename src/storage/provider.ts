/**
 * Pluggable storage layer for vault persistence.
 * Enables Cloud, Mobile, and Edge runtimes to use custom storage.
 */

export interface IStorageProvider {
    read(key: string): Promise<Buffer | null>;
    write(key: string, data: Buffer): Promise<void>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    /** Optional. If present, used for atomic save. Otherwise vault does write+delete. */
    rename?(fromKey: string, toKey: string): Promise<void>;
    /** Optional. If present, used to serialize read-modify-write sequences across writers. */
    withLock?<T>(key: string, task: () => Promise<T>): Promise<T>;
    /** Optional. Returns sub-keys (names) under a given prefix. */
    list?(prefix: string): Promise<string[]>;
}
