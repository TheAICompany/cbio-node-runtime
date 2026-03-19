# CBIO SDK Deep Reference

This document provides a comprehensive technical reference for the CBIO SDK, covering advanced API usage, custom storage implementation, and structured error handling.

For high-level concepts and quick start, see [README.md](../README.md). For module structure and naming rules, see [ARCHITECTURE.md](./ARCHITECTURE.md). For cross-language runtime contracts, see [spec/runtime/README.md](./spec/runtime/README.md).

---

## 1. Advanced Identity APIs

These methods are available under `identity.admin` and its sub-facets, and are intended for administrative or high-privilege bootstrap logic.

### 1.1 Vault Synchronization & Merging
- **`identity.admin.vault.mergeFrom(otherIdentity, options?)`**: Atomically merges secrets from another vault.
  - `onConflict`: `'abort'` (default), `'skip'`, or `'overwrite'`.
  - Throws `MERGE_IDENTITY_MISMATCH` if root identities differ.

### 1.2 Backups & Sealing
- **`identity.admin.vault.seal(kdk: string): string`**: Exports the entire vault as an encrypted blob.
- **`identity.admin.vault.loadFromSealedBlob(kdk: string, blob: string)`**: Restores a vault from a sealed backup.
- **`identity.admin.vault.saveVault()`**: Persists the current vault back to its bound storage.
- **`identity.admin.vault.saveVaultAs(storageKey)`**: One-time save of the vault to an explicit key/path. Does NOT change the bound storage for subsequent `saveVault()` or autosave.

Lower-level sealed blob primitives are also exported from the package subpath:

```ts
import { sealBlob, unsealBlob } from '@the-ai-company/cbio-node-runtime/sealed';
```

### 1.3 Audit & Lifecycle
- **`identity.admin.vault.getActivityLog()`**: Returns a read-only list of all vault-authenticated actions.
- **`identity.admin.managedAgents.revokeManagedAgent(publicKey, reason?)`**: Permanently revokes a child identity.
- **`identity.admin.managedAgents.getManagedAgentCapabilities(publicKey)`**: Returns `{ status, capabilities }` for a managed agent, so callers can distinguish active, revoked, missing, and invalid records.

### 1.4 Agent Handles
- **`getAgent()`**: Returns a minimally privileged handle with `vault:fetch` and `vault:list`.
- **`getAgent({ permissions })`**: Returns a handle with explicitly provided runtime permissions.
- **`getAgent({ deriveFromIssuedIdentity: true })`**: Derives runtime permissions from the issued identity's protocol capabilities.

`permissions` and `deriveFromIssuedIdentity` are mutually exclusive; do not pass both.

Secret-use operations on a `CbioAgent` require:
- `vault:fetch` for remote authenticated use such as `fetchWithAuth(...)`
- `vault:acquire` for acquisition, ingress, compare, proof, and validation operations

### 1.5 Recursive Child Identity Management
When a child is registered via `registerChildIdentity(keys)`, its key material is stored in the parent vault. The method returns `{ publicKey }` (domain-level identifier). Treat the persisted child record as runtime-managed state rather than application-readable plaintext.
```ts
const { publicKey: childPublicKey } = await identity.registerChildIdentity(keys);
console.log(childPublicKey);
```

---

## 2. Storage Customization

The SDK can run on any backend by implementing the `IStorageProvider` interface.

### 2.1 Interface Definition
```ts
export interface IStorageProvider {
  read(key: string): Promise<Buffer | null>;
  write(key: string, data: Buffer): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  rename?(fromKey: string, toKey: string): Promise<void>; // Improves atomic writes
}
```

### 2.2 Pre-built Providers
- **`MemoryStorageProvider`**: Ephemeral storage for testing or in-memory caches.
- **Filesystem (Default)**: Persists to `~/.c-bio/`. Use `C_BIO_VAULT_DIR` environment variable to override.

When loading an identity, use `storageKey` to choose the persisted vault location or provider key. Activity log behavior is configured explicitly with `activityLog`, for example `activityLog: { key: 'my-vault.activity.jsonl' }` or `activityLog: { enabled: false }`.

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

### 3.3 JSON Secret Acquisition
Use `fetchJsonAndAddSecret(...)` and `fetchJsonAndUpdateSecret(...)` when the upstream returns a JSON payload that contains a secret value to store or rotate.

```ts
const acquired = await agent.fetchJsonAndAddSecret({
  secretName: 'service-token',
  url: 'https://issuer.example.com/token',
  body: { scope: 'read' },
  extractKey: (response: { api_key?: string }) => response.api_key ?? '',
});
```

These methods are intentionally JSON-specific:
- request bodies are JSON-stringified
- responses are parsed with `response.json()`
- `extractKey(...)` receives the parsed JSON body

### 3.4 Local Auth Proxy
Use `startLocalAuthProxy(...)` when a local process should forward requests to an upstream API while vault-backed auth is injected automatically.

Required fields:
- `authHandle`: any object with `fetchWithAuth(...)`
- `secretName`: vault secret to inject
- `upstreamBaseUrl`: upstream API base URL

Optional fields:
- `authHeaderName`: defaults to `Authorization`
- `authPrefix`: defaults to `Bearer `
- `host`: defaults to `127.0.0.1`
- `port`: defaults to an ephemeral port

OpenAI example:
```ts
const proxy = await startLocalAuthProxy({
  authHandle: agent,
  secretName: 'openai',
  upstreamBaseUrl: 'https://api.openai.com',
});
```

Anthropic example:
```ts
const proxy = await startLocalAuthProxy({
  authHandle: agent,
  secretName: 'anthropic',
  upstreamBaseUrl: 'https://api.anthropic.com',
  authHeaderName: 'x-api-key',
  authPrefix: '',
});
```

Resend example:
```ts
const proxy = await startLocalAuthProxy({
  authHandle: agent,
  secretName: 'resend',
  upstreamBaseUrl: 'https://api.resend.com',
});
```

### 3.5 Local Secret Ingress
Use `startLocalSecretIngress(...)` when a trusted local process already has a newly issued secret and should hand it directly into CBIO without printing it to terminal output first.

```ts
const ingress = await identity.startLocalSecretIngress({
  secretName: 'service-token',
});

await fetch(ingress.url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${ingress.authToken}`,
    'Content-Type': 'text/plain',
  },
  body: 'new-secret-value',
});
```

Optional fields:
- `allowedOrigins`
- `overwrite`
- `host`
- `port`
- `path`
- `authToken`
- `once`
- `maxBodyBytes`

### 3.6 Local Compare / Proof
Use `compareSecret(...)` and `proveSecret(...)` when the application needs a local KMS-like operation without exporting the stored secret.

```ts
const same = await identity.compareSecret('service-token', 'candidate-value');
const proof = await identity.proveSecret('service-token', 'challenge-123');
```

Current proof algorithms:
- `sha256`
- `sha512`

`proveSecret(...)` returns a base64url-encoded HMAC proof for the active secret value and the provided challenge.

### 3.7 Secret Validation
Use `validateSecret(...)` when the application wants a structured validity result rather than exporting a secret and probing manually.

`validateSecret(...)` accepts a `SecretValidator`, whose `validate(handle)` method receives a restricted handle with:
- `fetchWithAuth(url, options?)`
- `compare(candidate)`
- `prove(challenge, options?)`

The validator never receives the plaintext secret value.

Result shape:

```ts
type SecretValidationResult = {
  valid: boolean;
  status: 'valid' | 'invalid' | 'indeterminate';
  reason?: string;
  providerSubject?: string;
  expiresAt?: string;
  scopes?: readonly string[];
  metadata?: Record<string, unknown>;
};
```

Minimal example:

```ts
const result = await identity.validateSecret('service-token', {
  async validate(handle) {
    const response = await handle.fetchWithAuth('https://api.example.com/me');
    return {
      valid: response.ok,
      status: response.ok ? 'valid' : 'invalid',
    };
  },
});
```

### 3.8 Generic HTTP Validator
Use `genericHttpValidator(...)` when a remote service can be probed by a normal authenticated HTTP request and you want a reusable validator without writing custom validator boilerplate.

```ts
const validator = genericHttpValidator({
  url: 'https://api.example.com/me',
  extractResult: (_response, data: { subject?: string; scopes?: string[] } | undefined) => ({
    providerSubject: data?.subject,
    scopes: data?.scopes,
  }),
});

const result = await identity.validateSecret('service-token', validator);
```

Supported config fields:
- `url`
- `method`
- `headers`
- `body`
- `isValid(response, data)`
- `classifyStatus(response, data)`
- `extractResult(response, data)`

Default behavior:
- `2xx` -> `{ valid: true, status: 'valid' }`
- `401/403` -> `{ valid: false, status: 'invalid', reason: 'http_<status>' }`
- other non-`2xx` -> `{ valid: false, status: 'indeterminate', reason: 'http_<status>' }`

---

## 4. Error Code Dictionary

The SDK uses structured `IdentityError` objects with the following codes:

| Code | Meaning | Typical Fix / Recovery |
| :--- | :--- | :--- |
| `PERMISSION_DENIED` | Handle lacks the required runtime capability. | Check `agent.can()` before calling. |
| `SECRET_NOT_FOUND` | Secret name does not exist in the vault. | Add it first or check the naming. |
| `ISSUED_IDENTITY_INVALID` | Bound or persisted issued identity failed protocol or authority/subject validation. | Re-issue the managed identity or load with the correct authority context. |
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
