/**
 * Default file-system storage provider. Uses node:fs with atomic write.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { IStorageProvider } from './provider.js';

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @internal
 */
export class FsStorageProvider implements IStorageProvider {
    constructor(private readonly _baseDir?: string) {}

    getBaseDir(): string {
        return this._baseDir || process.cwd();
    }

    private static readonly DIRECTORY_MODE = 0o700;
    private static readonly FILE_MODE = 0o600;

    private resolve(key: string): string {
        if (this._baseDir) {
            return path.join(this._baseDir, key);
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

    async withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
        const fullPath = this.resolve(`${key}.lock`);
        await fs.mkdir(path.dirname(fullPath), { recursive: true, mode: FsStorageProvider.DIRECTORY_MODE });

        for (;;) {
            try {
                const fh = await fs.open(fullPath, 'wx', FsStorageProvider.FILE_MODE);
                try {
                    return await task();
                } finally {
                    await fh.close();
                    await fs.unlink(fullPath).catch((error: any) => {
                        if (error.code !== 'ENOENT') throw error;
                    });
                }
            } catch (error: any) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
                await sleep(10);
            }
        }
    }
 
    async list(prefix: string): Promise<string[]> {
        const dir = this.resolve(prefix);
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            return entries.map(e => e.name);
        } catch (e: any) {
            if (e.code === 'ENOENT') return [];
            throw e;
        }
    }
}
