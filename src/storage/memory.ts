/**
 * In-memory storage provider. For testing and environments without persistent storage.
 */

import type { IStorageProvider } from './provider.js';

export class MemoryStorageProvider implements IStorageProvider {
    #store = new Map<string, Buffer>();
    #locks = new Map<string, Promise<void>>();

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

    async withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
        const previous = this.#locks.get(key) ?? Promise.resolve();
        let release!: () => void;
        const current = new Promise<void>((resolve) => {
            release = resolve;
        });
        const chained = previous.then(() => current);
        this.#locks.set(key, chained);
        await previous;
        try {
            return await task();
        } finally {
            release();
            if (this.#locks.get(key) === chained) {
                this.#locks.delete(key);
            }
        }
    }
 
    async list(prefix: string): Promise<string[]> {
        const results = new Set<string>();
        const searchPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
        for (const key of this.#store.keys()) {
            if (key.startsWith(searchPrefix)) {
                const remaining = key.substring(searchPrefix.length);
                const segment = remaining.split('/')[0];
                if (segment) results.add(segment);
            }
        }
        return Array.from(results);
    }
}
