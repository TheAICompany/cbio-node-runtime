/**
 * Default file-system storage provider. Uses node:fs with atomic write.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
export class FsStorageProvider {
    baseDir;
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    static DIRECTORY_MODE = 0o700;
    static FILE_MODE = 0o600;
    resolve(key) {
        if (this.baseDir) {
            return path.join(this.baseDir, key);
        }
        const dir = path.dirname(key);
        if (dir && dir !== '.') {
            return key;
        }
        return key;
    }
    async read(key) {
        try {
            return await fs.readFile(this.resolve(key));
        }
        catch (e) {
            if (e.code === 'ENOENT')
                return null;
            throw e;
        }
    }
    async write(key, data) {
        const fullPath = this.resolve(key);
        await fs.mkdir(path.dirname(fullPath), { recursive: true, mode: FsStorageProvider.DIRECTORY_MODE });
        await fs.writeFile(fullPath, data, { mode: FsStorageProvider.FILE_MODE });
        await fs.chmod(fullPath, FsStorageProvider.FILE_MODE);
        const fh = await fs.open(fullPath, 'r+');
        try {
            await fh.sync();
        }
        finally {
            await fh.close();
        }
    }
    async delete(key) {
        try {
            await fs.unlink(this.resolve(key));
        }
        catch (e) {
            if (e.code !== 'ENOENT')
                throw e;
        }
    }
    async has(key) {
        try {
            await fs.access(this.resolve(key));
            return true;
        }
        catch {
            return false;
        }
    }
    async rename(fromKey, toKey) {
        await fs.rename(this.resolve(fromKey), this.resolve(toKey));
    }
}
//# sourceMappingURL=fs.js.map