# Security Audit

Last updated: 2026-03-29

## Scope

This audit covers the current `node-runtime` codebase, with emphasis on the high-risk surfaces that directly affect secret handling and delegated agent execution:

- Agent proof verification
- Session token issuance, storage, and lookup
- Replay protection
- Dispatch execution
- Secret custody at rest
- Managed agent private key exposure
- Owner-side control surfaces
- Remote transport entrypoints

## Current Status

### Checked And Working

- Persistent runtime no longer uses dummy proof verification.
- Persistent runtime no longer uses dummy dispatch execution.
- Persistent runtime no longer uses dummy session token storage.
- Persistent runtime performs in-process replay protection.
- `ownerListAgents()` now returns the current `session_token` in the persistent runtime path.

### Findings

#### [High] Secret custody is not encrypted at rest in the file-backed runtime

Documentation repeatedly describes custody and registries as protected by `vaultWorkingKey`, but the file-backed implementation writes secret plaintext directly to disk.

Evidence:

- [docs/CUSTODY_MODEL.md](/Users/v/Local Projects/ai/cbio-org/node-runtime/docs/CUSTODY_MODEL.md)
- [docs/ARCHITECTURE.md](/Users/v/Local Projects/ai/cbio-org/node-runtime/docs/ARCHITECTURE.md)
- [src/vault-core/persistence.ts:126](/Users/v/Local Projects/ai/cbio-org/node-runtime/src/vault-core/persistence.ts#L126)
- [src/vault-core/persistence.ts:145](/Users/v/Local Projects/ai/cbio-org/node-runtime/src/vault-core/persistence.ts#L145)

`FileSecretCustody.store()` writes `plaintext` with `fs.writeFile(...)` and does not use `vaultWorkingKey`.

Impact:

- Anyone with filesystem read access can read raw secret material.
- The current implementation does not match the documented at-rest protection model.

#### [High] Managed agent private keys are stored in plaintext JSON on disk

Managed identities are persisted by writing the full `AgentIdentityRecord` JSON to disk. That record can include `private_key`.

Evidence:

- [src/vault-core/persistence.ts:201](/Users/v/Local Projects/ai/cbio-org/node-runtime/src/vault-core/persistence.ts#L201)
- [src/vault-core/contracts.ts:518](/Users/v/Local Projects/ai/cbio-org/node-runtime/src/vault-core/contracts.ts#L518)

Impact:

- Filesystem read access is enough to recover managed agent private keys.
- This weakens the intended custody model for managed identities.

#### [Medium] Sensitive-read confirmation is bypassable through raw `VaultService` / `VaultCore` paths

`OwnerClient` requires password or a sensitive-action verifier before reading secret plaintext or an agent private key. But the lower layers still expose raw owner operations or raw identity records without that confirmation.

Evidence:

- Sensitive confirmation exists only in [src/clients/owner/client.ts:52](/Users/v/Local Projects/ai/cbio-org/node-runtime/src/clients/owner/client.ts#L52)
- Raw export is directly exposed in [src/vault-ingress/index.ts:208](/Users/v/Local Projects/ai/cbio-org/node-runtime/src/vault-ingress/index.ts#L208)
- Raw owner list still comes from [src/vault-core/core.ts:650](/Users/v/Local Projects/ai/cbio-org/node-runtime/src/vault-core/core.ts#L650)

Notes:

- `OwnerClient.ownerListAgents()` strips `private_key` before returning.
- The lower layers do not enforce that same policy.
- This may be an intentional trust-boundary assumption for unlocked in-process callers, but it conflicts with the existence of separate sensitive-read confirmation APIs.

#### [Medium] Replay protection is not persisted across restart

Replay prevention now works in the active process, but the guard is still memory-backed.

Evidence:

- [src/vault-core/defaults.ts:440](/Users/v/Local Projects/ai/cbio-org/node-runtime/src/vault-core/defaults.ts#L440)
- [src/vault-core/persistence.ts:516](/Users/v/Local Projects/ai/cbio-org/node-runtime/src/vault-core/persistence.ts#L516)

Impact:

- A previously accepted request can be replayed after process restart if the caller still has a valid token and reuses the same request payload.
- This is more relevant for remote/process-isolation deployments than for purely local trusted deployments.

### Checked But Acceptable For Now

- Remote agent HTTP helpers require a session token before forwarding to vault control or dispatch handling.
  - [src/vault-ingress/server-utils.ts](/Users/v/Local Projects/ai/cbio-org/node-runtime/src/vault-ingress/server-utils.ts)
- Owner remote control is intentionally disabled in the provided HTTP helpers.
  - [src/vault-ingress/server-utils.ts:59](/Users/v/Local Projects/ai/cbio-org/node-runtime/src/vault-ingress/server-utils.ts#L59)

## Verification Performed

The following test coverage currently supports the checked items above:

- [tests/smoke/runtime-surface.js](/Users/v/Local Projects/ai/cbio-org/node-runtime/tests/smoke/runtime-surface.js)
  - Verifies in-memory token rotation and `ownerListAgents()` visibility.
- [tests/smoke/policy-and-persistence.js](/Users/v/Local Projects/ai/cbio-org/node-runtime/tests/smoke/policy-and-persistence.js)
  - Verifies persistent token storage, recovery, real dispatch, and post-restart visibility.
- [tests/smoke/persistent-runtime-security.js](/Users/v/Local Projects/ai/cbio-org/node-runtime/tests/smoke/persistent-runtime-security.js)
  - Verifies persistent runtime rejects invalid tokens and rejects replay within the running process.
- `npm run test:acceptance`
  - Passing as of this audit update.

## Recommended Next Fixes

1. Encrypt `FileSecretCustody` contents with `vaultWorkingKey` instead of writing plaintext.
2. Encrypt or otherwise protect managed agent private keys at rest.
3. Decide whether raw `VaultService` / `VaultCore` owner reads are allowed by design. If not, enforce sensitive-read policy below the `OwnerClient` wrapper.
4. If remote/process-isolated deployment is a real target, persist replay state across restart or derive replay rejection from durable request records.
