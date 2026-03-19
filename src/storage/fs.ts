/**
 * Default file-system storage provider. Uses node:fs with atomic write.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { IStorageProvider } from './provider.js';

export class FsStorageProvider implements IStorageProvider {
    constructor(private baseDir?: string) {}

    private static readonly DIRECTORY_MODE = 0o700;
    private static readonly FILE_MODE = 0o600;

    private resolve(key: string): string {
        if (this.baseDir) {
            return path.join(this.baseDir, key);
        }
        const dir = path.dirname(key);
        if (dir && dir !== '.') {
            return key;
        }
        return key;
    }

    async read(key: string): Promise<Buffer | null> {
        try {
            return await fs.readFile(this.resolve(key));
        } catch (e: any) {
            if (e.code === 'ENOENT') return null;
            throw e;
        }
    }

    async write(key: string, data: Buffer): Promise<void> {
        const fullPath = this.resolve(key);
        await fs.mkdir(path.dirname(fullPath), { recursive: true, mode: FsStorageProvider.DIRECTORY_MODE });
        await fs.writeFile(fullPath, data, { mode: FsStorageProvider.FILE_MODE });
        await fs.chmod(fullPath, FsStorageProvider.FILE_MODE);
        const fh = await fs.open(fullPath, 'r+');
        try {
            await fh.sync();
        } finally {
            await fh.close();
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await fs.unlink(this.resolve(key));
        } catch (e: any) {
            if (e.code !== 'ENOENT') throw e;
        }
    }

    async has(key: string): Promise<boolean> {
        try {
            await fs.access(this.resolve(key));
            return true;
        } catch {
            return false;
        }
    }

    async rename(fromKey: string, toKey: string): Promise<void> {
        await fs.rename(this.resolve(fromKey), this.resolve(toKey));
    }
}
