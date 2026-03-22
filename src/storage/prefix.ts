import type { IStorageProvider } from "./provider.js";

function joinPrefix(prefix: string, key: string): string {
  return key ? `${prefix}/${key}` : prefix;
}

export class PrefixStorageProvider implements IStorageProvider {
  constructor(
    private readonly base: IStorageProvider,
    private readonly prefix: string,
  ) {}

  private key(key: string): string {
    return joinPrefix(this.prefix, key);
  }

  read(key: string): Promise<Buffer | null> {
    return this.base.read(this.key(key));
  }

  write(key: string, data: Buffer): Promise<void> {
    return this.base.write(this.key(key), data);
  }

  delete(key: string): Promise<void> {
    return this.base.delete(this.key(key));
  }

  has(key: string): Promise<boolean> {
    return this.base.has(this.key(key));
  }

  rename?(fromKey: string, toKey: string): Promise<void> {
    if (!this.base.rename) {
      throw new Error("underlying storage provider does not support rename");
    }
    return this.base.rename(this.key(fromKey), this.key(toKey));
  }

  withLock?<T>(key: string, task: () => Promise<T>): Promise<T> {
    if (!this.base.withLock) {
      return task();
    }
    return this.base.withLock(this.key(key), task);
  }
}

export function createPrefixedStorage(base: IStorageProvider, prefix: string): PrefixStorageProvider {
  return new PrefixStorageProvider(base, prefix);
}
