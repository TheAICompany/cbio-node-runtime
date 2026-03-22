import { Buffer } from "node:buffer";
import { sealBlob, unsealBlob } from "./seal.js";
import type { IStorageProvider } from "../storage/provider.js";

/**
 * Universal sealed JSON storage repository.
 * Used by both ordinary vaults and identity private vaults.
 */
export class SealedJsonRepository<T> {
  constructor(
    public readonly storage: IStorageProvider,
    private readonly _key: string,
    private readonly _vaultWorkingKey?: string,
  ) {}

  async read(fallback: T): Promise<T> {
    const payload = await this.storage.read(this._key);
    if (!payload) {
      return fallback;
    }
    if (!this._vaultWorkingKey) {
      return JSON.parse(payload.toString("utf8")) as T;
    }
    try {
      const unsealed = unsealBlob(payload.toString("utf8"), this._vaultWorkingKey);
      const secretPayload = unsealed.secrets.payload;
      if (typeof secretPayload !== "string") {
        throw new Error("sealed payload missing body");
      }
      return JSON.parse(secretPayload) as T;
    } catch (e) {
      // If we have a key but unseal fails, it might be legacy plaintext or wrong key.
      throw e;
    }
  }

  async write(value: T, metadataKind?: string): Promise<void> {
    if (!this._vaultWorkingKey) {
      const data = Buffer.from(JSON.stringify(value, null, 2), "utf8");
      await this.storage.write(this._key, data);
      return;
    }
    const sealed = sealBlob(
      {
        version: "v1.0",
        secrets: {
          payload: JSON.stringify(value),
        },
        secretMetadata: {
          kind: metadataKind || "sealed_json",
          key: this._key,
        },
      },
      this._vaultWorkingKey,
    );
    await this.storage.write(this._key, Buffer.from(sealed, "utf8"));
  }
}
