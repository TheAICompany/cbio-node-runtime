/**
 * Default file-system storage provider. Uses node:fs with atomic write.
 */
import type { IStorageProvider } from './provider.js';
export declare class FsStorageProvider implements IStorageProvider {
    private baseDir?;
    constructor(baseDir?: string | undefined);
    private static readonly DIRECTORY_MODE;
    private static readonly FILE_MODE;
    private resolve;
    read(key: string): Promise<Buffer | null>;
    write(key: string, data: Buffer): Promise<void>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    rename(fromKey: string, toKey: string): Promise<void>;
}
