# CBIO Vault Runtime Reference (v1.48.4)

This document describes the current implemented runtime surface for the **Sovereign Vault**. 

## Primary API Surface

The v1.48.4 runtime centers on a simplified, authority-centric model with managed agency and session tokens, featuring a **Discovery-first** HITL workflow and real-time observers.

### Main Constructors and Entrypoints

- `createVault(...)` - Initialize a new vault using a master password.
- `recoverVault(...)` - Reopen an existing vault using its master password.
- `listVaults(...)` - Scan the workspace for available vault IDs.
- `updateVaultMetadata(...)` - Update the nickname or other metadata of an unlocked vault.
- `createOwnerSession(...)` - Create an SDK-managed owner session handle for long-running apps such as GUIs.
- `createVaultClient(...)` - Create an administrative client for the current runtime. Best for short-lived scripts or one-shot tasks.
- `createAgentClient(...)` - Create a delegated client for an agent.
- `createIdentity(...)` - Generate a standalone cryptographic identity keypair.
- `restoreIdentity(...)` - Restore an identity from a private key.

### Vault Lifecycle

#### `createVault(storage, { password, nickname, metadata })`
Creates a secure vault. 
- **Authority**: Rooted in the `password`.
- **Storage**: All data is encrypted using a key derived from the password via `scrypt`.
- **Vault ID**: Generated internally by the runtime.

#### `recoverVault(storage, { vaultId, password })`
Unlocks and reopens a vault. 
- Returns a `RecoveredVault` object containing the `VaultService` and metadata.

#### `createOwnerSession(storage, { vaultId, password, ... })`
Creates a first-class owner session for GUI and other long-running processes.
- Hold the `OwnerSession`, not a raw `VaultClient`.
- Call `session.client()` or `session.withClient(...)` when you need an owner client.
- Invalidate the session explicitly when the vault is locked or the app unloads.

### Owner Session Lifecycle

- `createVaultClient(...)` is not a long-lived session handle.
- Do not cache a raw `VaultClient` across HMR, module reloads, runtime swaps, or similar process-local lifecycle changes.
- For long-running apps, keep an `OwnerSession` and let the SDK recreate owner clients on demand.
- For short-lived scripts, `recoverVault(...)` plus `createVaultClient(...)` remains appropriate.

#### `listVaults(storage)`
Returns a `string[]` of vault IDs found in the storage. 
- **Privacy**: No metadata (like nicknames) is leaked during listing. You must recover a vault to see its details.

## Identity Models

### 1. Managed Identity (Recommended)
Identity material (private keys) generated and stored securely within the vault's own registry. 
- Use `client.ownerCreateAgent(...)` to manage these.
- **Session Tokens**: Owners can issue revocable `sat_...` tokens for managed agents to enable stateless authentication without raw private keys.

### 2. External Identity
Identity material already managed elsewhere can be imported into vault custody via `client.ownerImportAgent({ privateKey, ... })`.

## Vault Client (Owner/Admin)

The `VaultClient` provides the administrative interface for the vault.

### Stable Owner API Checklist

The following owner-side methods are part of the supported public surface and are intended to be called through an owner session or a short-lived owner client:

- `ownerWriteSecret(...)`
- `ownerReadSecretPlaintext(...)`
- `ownerExportSecret(...)`
- `ownerCreateAgent(...)`
- `ownerImportAgent(...)`
- `ownerUpdateAgent(...)`
- `ownerReadAgentPrivateKey(...)`
- `ownerListAgents(...)`
- `ownerGrantCapability(...)`
- `ownerRevokeCapability(...)`
- `ownerListCapabilities(...)`
- `ownerListSecrets(...)`
- `ownerRegisterFlow(...)`
- `ownerSubmitCapabilityRequest(...)`
- `ownerListPendingCapabilityRequests()`
- `ownerApproveCapabilityRequest(...)`
- `ownerRejectCapabilityRequest(...)`
- `ownerOnPendingCapabilityRequest(...)`
- `ownerListPendingDispatches()`
- `ownerApproveDispatch(...)`
- `ownerRejectDispatch(...)`
- `ownerOnPendingDispatch(...)`
- `ownerIssueSessionToken(...)`
- `ownerIssueAllSessionTokens()`
- `ownerRevokeSessionToken(...)`
- `ownerReadAudit(...)`

### Core Operations
- `ownerWriteSecret(...)`: Store a secret and bind it to specific targets in one step.
- `ownerCreateAgent(...)`: Generate and host a new agent identity, then return its public record plus a session token.
- `ownerImportAgent(...)`: Import an existing private key into vault custody, then return its public record plus a session token.
- `ownerUpdateAgent(...)`: Update an agent's stored nickname and metadata.
- `ownerListAgents()`: Enumerate authorized agents. Private keys are redacted from the default list response.
- `ownerGrantCapability(...)`: Assign specific secret-use permissions to an agent. Capability IDs are generated internally.
- `ownerSubmitCapabilityRequest(...)`: Submit a broader pending capability request for later owner review.
- `ownerListPendingCapabilityRequests()`: List proactive capability requests that are waiting for approval.
- `ownerApproveCapabilityRequest({ requestId })`: Turn a pending capability request into a real stored capability. Capability IDs are generated internally.
- `ownerRejectCapabilityRequest(requestId)`: Deny a pending capability request.
- `ownerOnPendingCapabilityRequest(callback)`: Register a real-time observer to receive proactive capability requests.
- `ownerListPendingDispatches()`: List agent requests awaiting manual approval (HITL).
- `ownerApproveDispatch({ requestId, permanent, skipAudit })`: Grant a stalled request manual authorization.
- `ownerOnPendingDispatch(callback)`: Register a real-time observer to receive push notifications for discovery requests.
- `ownerRejectDispatch(requestId)`: Deny a stalled request.
- `ownerIssueSessionToken(input)`: Issue a session token for a specific agent.
- `ownerIssueAllSessionTokens()`: Batch-issue session tokens for ALL registered agents (Automatic during `createVaultClient` warmup).
- `ownerRevokeSessionToken({ token })`: Invalidate a specific session token.
- `ownerReadSecretPlaintext({ alias, password })`: Read one secret's plaintext after re-entering the vault password.
- `ownerExportSecret({ alias, password })`: Export a secret's full plaintext record after re-entering the vault password.
- `ownerReadAgentPrivateKey({ agentId, password })`: Read one managed agent private key after re-entering the vault password.
- `ownerReadAudit(...)`: Access the append-only record of all vault actions.

### Sensitive Action Contract

The following owner operations are sensitive actions:

- `ownerReadSecretPlaintext(...)`
- `ownerExportSecret(...)`
- `ownerReadAgentPrivateKey(...)`
- `ownerDeleteSecret(...)`

All three require:

- `password`
- optional `verificationCode`

Client configuration:

- `createVaultClient(...)` may be configured with `sensitiveActionVerifier(confirmation, context)`
- if no `sensitiveActionVerifier` is provided, `passwordVerifier(password)` is required for these operations

Stable owner client error codes:

- `SENSITIVE_ACTION_PASSWORD_REQUIRED`
- `SENSITIVE_ACTION_VERIFIER_REQUIRED`
- `SENSITIVE_ACTION_REJECTED`
- `SENSITIVE_ACTION_INVALID_PASSWORD`
- `AGENT_PRIVATE_KEY_NOT_FOUND`
- `INVALID_CREATE_VAULT_CLIENT_OPTIONS`

Recommended GUI behavior:

- Keep an `OwnerSession`, not a raw `VaultClient`
- Call `session.client()` or `session.withClient(...)` for each owner operation
- Show a single reusable confirmation dialog for sensitive actions
- Always collect the password
- Optionally collect a second factor such as a 6-digit verification code
- Branch UI behavior on `OwnerClientError.code` rather than parsing error strings

## Agent Client (Consumer)

The `AgentClient` is used by delegated processes (e.g., LLMs or background workers) to perform authorized actions.

### Core Operations
- `agentDispatch(...)`: Use a granted capability to send a secret to an authorized target.
  - **Status**: Returns `SUCCEEDED`, `FAILED`, or `PENDING`.
  - **Discovery Flow**: If an agent attempts an action not explicitly in its white-list, the request is automatically stalled as `PENDING` for owner review. 
- `agentListCapabilities()`: Read the current capability table granted to that agent.
- `agentListSecrets()`: Read all secret metadata in the vault, with per-secret authorization markers showing which entries the agent can currently use.
- `agentSubmitCapabilityRequest(...)`: Ask the owner for a broader `scope + methods` grant before dispatching.
- **Security**: The agent never handles the vault's master password. Agent execution uses **Session Tokens** rather than raw private-key dispatch.
- **Auditing**: Dispatches are audited by default. Set `skipAudit: true` in the capability (or during approval) to disable logging for specific actions.

## Proactive Capability Approval

The runtime now supports a second approval path alongside dispatch discovery:

- **Dispatch discovery**: A concrete dispatch misses existing capability coverage and becomes `PENDING`.
- **Capability request**: An external planner or controller submits a broader capability proposal before any dispatch is attempted.

This is useful for LLM-driven planners that can infer the needed scope ahead of time, for example:
- scope `https://api.example.com/users/*`
- methods `["GET"]`

The request stays pending until the owner approves or rejects it:
- `ownerSubmitCapabilityRequest(...)` creates the request record.
- `ownerListPendingCapabilityRequests()` reads the current queue.
- `ownerApproveCapabilityRequest(...)` persists a real capability.
- `ownerRejectCapabilityRequest(...)` removes the request without granting access.
- `ownerOnPendingCapabilityRequest(...)` supports push-style owner interfaces.

The proactive request flow does not replace dispatch discovery. It is an additional, explicit path for requesting broader access without generating one pending dispatch per resource ID.

## Storage Layout

The vault uses a unified encrypted partition:
- `vaults/<vaultId>_v1/profile.sealed`: Unified vault profile.
- `vaults/<vaultId>_v1/secrets.sealed`: Secret registry.
- `vaults/<vaultId>_v1/agents.sealed`: Agent identity registry.
- `vaults/<vaultId>_v1/capabilities.sealed`: Capability registry.
- `vaults/<vaultId>_v1/custom-flows.sealed`: Custom flow registry.
- `vaults/<vaultId>_v1/audit.jsonl`: Tamper-evident audit log.
- `vaults/<vaultId>_v1/working-key.sealed`: Sealed working-key custody blob.
- `vaults/<vaultId>_v1/secret-<secretId>.sealed`: Encrypted secret material.

## Build & Integration

Ensure you are using the latest distribution:
- `dist/runtime/index.js`
- `dist/runtime/index.d.ts`

For a full generated API reference, run:
```bash
npm run build:docs
```
