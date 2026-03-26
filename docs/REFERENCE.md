# CBIO Vault Runtime Reference (v1.48.4)

This document describes the current implemented runtime surface for the **Sovereign Vault**. 

## Primary API Surface

The v1.48.4 runtime centers on a simplified, authority-centric model with managed agency and session tokens, featuring a **Discovery-first** HITL workflow and real-time observers.

### Main Constructors and Entrypoints

- `createVault(...)` - Initialize a new vault using a master password.
- `recoverVault(...)` - Reopen an existing vault using its master password.
- `listVaults(...)` - Scan the workspace for available vault IDs.
- `updateVaultMetadata(...)` - Update the nickname or other metadata of an unlocked vault.
- `createVaultClient(...)` - Create an administrative client for an unlocked vault. For plaintext secret reads, configure `passwordVerifier`.
- `createAgentClient(...)` - Create a delegated client for an agent.
- `createIdentity(...)` - Generate a standalone cryptographic identity keypair.
- `restoreIdentity(...)` - Restore an identity from a private key.

### Vault Lifecycle

#### `createVault(storage, { vaultId, password, nickname, metadata })`
Creates a secure vault. 
- **Authority**: Rooted in the `password`.
- **Storage**: All data is encrypted using a key derived from the password via `scrypt`.

#### `recoverVault(storage, { vaultId, password })`
Unlocks and reopens a vault. 
- Returns a `RecoveredVault` object containing the `VaultService` and metadata.

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

### Core Operations
- `ownerWriteSecret(...)`: Store a secret and bind it to specific targets in one step.
- `ownerCreateAgent(...)`: Generate and host a new agent identity, then return its public record plus a session token.
- `ownerImportAgent(...)`: Import an existing private key into vault custody, then return its public record plus a session token.
- `ownerListAgents()`: Enumerate authorized agents. Private keys are redacted from the default list response.
- `ownerGrantCapability(...)`: Assign specific secret-use permissions to an agent. 
- `ownerSubmitCapabilityRequest(...)`: Submit a broader pending capability request for later owner review.
- `ownerListPendingCapabilityRequests()`: List proactive capability requests that are waiting for approval.
- `ownerApproveCapabilityRequest({ requestId, capabilityId })`: Turn a pending capability request into a real stored capability.
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
- `vault/sealed/profile.sealed`: Unified vault profile.
- `vault/sealed/secrets.sealed`: Secret registry.
- `vault/sealed/custody/`: Encrypted secret material.
- `vault/sealed/identities/`: Agent and capability registries.

## Build & Integration

Ensure you are using the latest distribution:
- `dist/runtime/index.js`
- `dist/runtime/index.d.ts`

For a full generated API reference, run:
```bash
npm run build:docs
```
