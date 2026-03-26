# CBIO Vault Runtime Reference (v1.48.4)

This document describes the current implemented runtime surface for the **Sovereign Vault**. 

## Primary API Surface

The v1.48.4 runtime centers on a simplified, authority-centric model with managed agency and session tokens, featuring a **Discovery-first** HITL workflow and real-time observers.

### Main Constructors and Entrypoints

- `createVault(...)` - Initialize a new vault using a master password.
- `recoverVault(...)` - Reopen an existing vault using its master password.
- `listVaults(...)` - Scan the workspace for available vault IDs.
- `updateVaultMetadata(...)` - Update the nickname or other metadata of an unlocked vault.
- `createVaultClient(...)` - Create an administrative client for an unlocked vault.
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
- Use `client.createAgent(...)` to manage these.
- **Session Tokens**: Owners can issue revocable `sat_...` tokens for managed agents to enable stateless authentication without raw private keys.

### 2. External Identity
Identity material managed by the user outside the vault. Registered via `client.registerAgent({ publicKey, ... })`.

## Vault Client (Owner/Admin)

The `VaultClient` provides the administrative interface for the vault.

### Core Operations
- `writeSecret(...)`: Store a secret and bind it to specific targets in one step.
- `createAgent(...)`: Generate and host a new agent identity.
- `listAgents()`: Enumerate authorized agents and retrieve managed private keys.
- `grantCapability(...)`: Assign specific secret-use permissions to an agent. 
- `submitCapabilityRequest(...)`: Submit a broader pending capability request for later owner review.
- `listPendingCapabilityRequests()`: List proactive capability requests that are waiting for approval.
- `approveCapabilityRequest({ requestId, capabilityId })`: Turn a pending capability request into a real stored capability.
- `rejectCapabilityRequest(requestId)`: Deny a pending capability request.
- `onPendingCapabilityRequest(callback)`: Register a real-time observer to receive proactive capability requests.
- `listPendingDispatches()`: List agent requests awaiting manual approval (HITL).
- `approveDispatch({ requestId, permanent, skipAudit })`: Grant a stalled request manual authorization.
- `onPendingRequest(callback)`: Register a real-time observer to receive push notifications for discovery requests.
- `rejectDispatch(requestId)`: Deny a stalled request.
- `issueSessionToken(input)`: Issue a session token for a specific agent.
- `issueAllSessionTokens()`: Batch-issue session tokens for ALL registered agents (Automatic during `createVaultClient` warmup).
- `revokeSessionToken({ token })`: Invalidate a specific session token.
- `exportSecret(...)`: Reveal a secret's plaintext (requires active authority).
- `readAudit(...)`: Access the append-only record of all vault actions.

## Agent Client (Consumer)

The `AgentClient` is used by delegated processes (e.g., LLMs or background workers) to perform authorized actions.

### Core Operations
- `dispatch(...)`: Use a granted capability to send a secret to an authorized target.
  - **Status**: Returns `SUCCEEDED`, `FAILED`, or `PENDING`.
  - **Discovery Flow**: If an agent attempts an action not explicitly in its white-list, the request is automatically stalled as `PENDING` for owner review. 
- **Security**: The agent never handles the vault's master password. By using **Session Tokens**, the agent also avoids handling its own raw private key in memory.
- **Auditing**: Dispatches are audited by default. Set `skipAudit: true` in the capability (or during approval) to disable logging for specific actions.

## Proactive Capability Approval

The runtime now supports a second approval path alongside dispatch discovery:

- **Dispatch discovery**: A concrete dispatch misses existing capability coverage and becomes `PENDING`.
- **Capability request**: An external planner or controller submits a broader capability proposal before any dispatch is attempted.

This is useful for LLM-driven planners that can infer the needed scope ahead of time, for example:
- scope `https://api.example.com/users/*`
- methods `["GET"]`

The request stays pending until the owner approves or rejects it:
- `submitCapabilityRequest(...)` creates the request record.
- `listPendingCapabilityRequests()` reads the current queue.
- `approveCapabilityRequest(...)` persists a real capability.
- `rejectCapabilityRequest(...)` removes the request without granting access.
- `onPendingCapabilityRequest(...)` supports push-style owner interfaces.

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
