/**
 * In-memory storage provider. For testing and environments without persistent storage.
 */
import type { IStorageProvider } from './provider.js';
export declare class MemoryStorageProvider implements IStorageProvider {
    #private;
    read(key: string): Promise<Buffer | null>;
    write(key: string, data: Buffer): Promise<void>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
}
