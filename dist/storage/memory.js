/**
 * In-memory storage provider. For testing and environments without persistent storage.
 */
export class MemoryStorageProvider {
    #store = new Map();
    async read(key) {
        return this.#store.get(key) ?? null;
    }
    async write(key, data) {
        this.#store.set(key, data);
    }
    async delete(key) {
        this.#store.delete(key);
    }
    async has(key) {
        return this.#store.has(key);
    }
}
//# sourceMappingURL=memory.js.map