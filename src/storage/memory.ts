/**
 * In-memory storage provider. For testing and environments without persistent storage.
 */

import type { IStorageProvider } from './provider.js';

export class MemoryStorageProvider implements IStorageProvider {
    #store = new Map<string, Buffer>();

    async read(key: string): Promise<Buffer | null> {
        return this.#store.get(key) ?? null;
    }

    async write(key: string, data: Buffer): Promise<void> {
        this.#store.set(key, data);
    }

    async delete(key: string): Promise<void> {
        this.#store.delete(key);
    }

    async has(key: string): Promise<boolean> {
        return this.#store.has(key);
    }
}
