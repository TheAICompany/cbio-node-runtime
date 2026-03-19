# CBIO SDK Deep Reference

This document provides a comprehensive technical reference for the CBIO SDK, covering advanced API usage, custom storage implementation, and structured error handling.

For high-level concepts and quick start, see [README.md](../README.md). For governance and introspection, see [CAPABILITIES.md](../CAPABILITIES.md).

---

## 1. Advanced Identity APIs

These methods are available under `identity.admin` and are intended for administrative or high-privilege bootstrap logic.

### 1.1 Vault Synchronization & Merging
- **`mergeFrom(otherIdentity, options?)`**: Atomically merges secrets from another vault.
  - `onConflict`: `'abort'` (default), `'skip'`, or `'overwrite'`.
  - Throws `MERGE_IDENTITY_MISMATCH` if root identities differ.

### 1.2 Backups & Sealing
- **`seal(kdk: string): string`**: Exports the entire vault as an encrypted blob.
- **`loadFromSealedBlob(kdk: string, blob: string)`**: Restores a vault from a sealed backup.

### 1.3 Audit & Lifecycle
- **`getActivityLog()`**: Returns a read-only list of all vault-authenticated actions.
- **`revokeManagedAgent(publicKey, reason?)`**: Permanently revokes a child identity.
- **`getManagedAgentCapabilities(publicKey)`**: Inspects the signed privileges of a sub-identity.

### 1.4 Recursive Child Identity Management
When a child is registered via `registerChildIdentity(keys)`, its key material is stored in the parent vault. To load it later:
```ts
const secretName = getChildIdentitySecretName(childPublicKey);
const stored = identity.admin.getSecret(secretName);
if (stored) {
  const { privateKey, publicKey } = JSON.parse(stored);
  const childIdentity = await CbioIdentity.load({ privateKey, publicKey });
}
```

---

## 2. Storage Customization

The SDK can run on any backend by implementing the `IStorageProvider` interface.

### 2.1 Interface Definition
```ts
export interface IStorageProvider {
  read(key: string): Promise<Uint8Array | null>;
  write(key: string, data: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  rename?(from: string, to: string): Promise<void>; // Improves atomic writes
}
```

### 2.2 Pre-built Providers
- **`MemoryStorageProvider`**: Ephemeral storage for testing or in-memory caches.
- **Filesystem (Default)**: Persists to `~/.c-bio/`. Use `C_BIO_VAULT_DIR` environment variable to override.

---

## 3. Advanced Request Patterns

### 3.1 Custom Fetch for SDKs (OpenAI/Anthropic)
If a third-party SDK supports a custom `fetch` implementation, use `createFetchWithAuth`. This keeps the vault boundary while using the official client.
```ts
const openai = new OpenAI({
  fetch: agent.createFetchWithAuth('openai'),
});
```

### 3.2 Complex HTTP Calls
Use full request options for `fetchWithAuth`:
```ts
const response = await agent.fetchWithAuth('my-secret', 'https://api.example.com', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' }),
  authPrefix: 'Token ', // Optional: default is 'Bearer '
  withSignature: true,  // Optional: adds X-CBIO-Signature
});
```

---

## 3. Error Code Dictionary

The SDK uses structured `IdentityError` objects with the following codes:

| Code | Meaning | Typical Fix / Recovery |
| :--- | :--- | :--- |
| `PERMISSION_DENIED` | Handle lacks the required runtime capability. | Check `agent.can()` before calling. |
| `SECRET_NOT_FOUND` | Secret name does not exist in the vault. | Add it first or check the naming. |
| `SECRET_ALREADY_EXISTS` | `addSecret` used on an existing name. | Use a new name or `update`. |
| `SECRET_POLICY_REQUIRED` | Agent rotation attempted without allowed origins. | Set origins in identity code. |
| `SECRET_SOURCE_ORIGIN_MISMATCH` | Rotation came from a disallowed origin. | Check secret policy and rotation URL. |
| `VAULT_PERSISTENCE_FAILED` | Storage is not writable. | Fix permissions or check storage path. |
| `VAULT_FILE_NOT_FOUND` | Expected vault file does not exist. | Initialize identity or check storage key. |
| `VAULT_WRITE_INTEGRITY_FAILED` | Save verification failed. | Check disk space/integrity. |
| `VAULT_CORRUPTED` | Vault file is truncated or unreadable. | Restore from backup; do not overwrite. |
| `VAULT_DECRYPT_FAILED` | Decryption failed (wrong key or tampered). | Verify the correct Private Key was used. |
| `MERGE_IDENTITY_MISMATCH` | Tried to merge vaults of different identities. | Only merge vaults of the same identity. |
| `CHILD_IDENTITY_REQUIRES_PRIVATE_KEY` | Child keys were incomplete on registration. | Ensure child keys include Private Key. |
| `SIGNER_REQUIRES_PRIVATE_KEY` | Administrative action requires a full signer. | Load identity from a full private key. |

---

## 5. CLI & Broker Mode
The `cbio-identity` binary provides administrative tools and a local auth broker.

- `cbio-identity init`: Provision a new root identity.
- `cbio-identity get/delete <name>`: Plaintext management (requires `AGENT_PRIV_KEY`).
- `cbio-identity proxy <provider>`: Starts a loopback-only proxy for providers like `openai`, `anthropic`, or `resend`. This is useful for SDKs that do not support custom fetch.
