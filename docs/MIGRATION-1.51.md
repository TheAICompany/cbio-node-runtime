# Migration 1.50.x to 1.51.x

This release tightens the public owner-side contract so GUI clients can stop depending on private behavior.

## Breaking Changes

### Vault storage layout

- Vault directories now use a versioned flat layout: `vaults/<vaultId>_v1/`
- The old nested `vault/sealed/...` structure is no longer the active layout
- Persistent file names are now flat under the versioned vault directory, for example:
  - `profile.sealed`
  - `secrets.sealed`
  - `agents.sealed`
  - `capabilities.sealed`
  - `custom-flows.sealed`
  - `audit.jsonl`
  - `working-key.sealed`
  - `secret-<secretId>.sealed`

This version suffix is for storage-layout evolution. Future storage rewrites should increment the directory suffix rather than introducing deeper wrapper directories.

### Owner client initialization

- `createOwnerClient(...)` now has a stable public type for:
  - `passwordVerifier`
  - `sensitiveActionVerifier`
- If your UI reads secret plaintext or agent private keys, configure one of these verifiers.
- For long-running GUI processes, prefer `openOwnerSession(...)` and obtain owner clients from the session rather than caching a raw `OwnerClient`.

### Sensitive actions

These are now explicit sensitive reads:

- `ownerReadSecretPlaintext({ alias, password, verificationCode? })`
- `ownerExportSecret({ alias, password, verificationCode? })`
- `ownerReadAgentPrivateKey({ rootAgentId, password, verificationCode? })`

`ownerListAgents()` no longer exposes private keys.

The owner client now exposes stable error codes for sensitive-action failures through:

- `OwnerClientError`
- `OwnerClientErrorCode`

GUI clients should branch on `error.code` instead of parsing raw message text.

### Agent read model

- `ownerListAgents()` returns the stable public agent record:
  - `rootAgentId`
  - `rootAgentId`
  - `publicKey`
  - `nickname`
  - `metadata`
- `privateKey` is redacted from the list response.

### Agent creation and import

- `ownerCreateAgent(...)` no longer accepts caller-supplied `rootAgentId`
- `ownerImportAgent(...)` no longer accepts caller-supplied `rootAgentId`
- Both now return:
  - `agent`
  - `sessionToken`

Use `result.agent.rootAgentId` as the vault-internal agent ID.

### Grant creation

- `ownerGrantGrant(...)` no longer accepts caller-supplied `grantId`
- `ownerExecuteGrantStateAndGrant(...)` no longer accepts caller-supplied `grantId`
- Grant IDs are generated internally

`ownerGrantGrant(...)` now returns the created grant so the caller can read the generated ID immediately.

### Custom flow creation

- `ownerRegisterFlow(...)` no longer accepts caller-supplied `flowId`
- Flow IDs are generated internally

`ownerRegisterFlow(...)` now returns the created flow definition so the caller can read `flowId`.

## New Public API

- `ownerUpdateAgent({ rootAgentId, nickname?, metadata? })`

This updates the stored owner-side agent profile and persists it. The operation is audited.

## Recommended GUI changes

- Remove UI inputs for:
  - `rootAgentId` during create/import
  - `grantId`
  - `flowId`
- Treat `rootAgentId`, `grantId`, and `flowId` as SDK-managed internal identifiers
- Use returned records instead of constructing IDs in the UI
- Keep an SDK-managed owner session handle instead of caching a raw `createOwnerClient(...)` result across reloads or runtime swaps
- If you are not using `OwnerSession`, recreate `createOwnerClient(...)` after runtime/module changes rather than reusing an old instance
- Route plaintext/private-key reads through a single sensitive-action confirmation dialog
