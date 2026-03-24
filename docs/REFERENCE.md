# CBIO Vault Runtime Reference (v1.47.0)

This document describes the current implemented runtime surface for the **Sovereign Vault**. 

## Primary API Surface

The v1.47.0 runtime centers on a simplified, authority-centric model.

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

### 2. External Identity
Identity material managed by the user outside the vault. Registered via `client.registerAgent({ publicKey, ... })`.

## Vault Client (Owner/Admin)

The `VaultClient` provides the administrative interface for the vault.

### Core Operations
- `writeSecret(...)`: Store a secret and bind it to specific targets in one step.
- `createAgent(...)`: Generate and host a new agent identity.
- `listAgents()`: Enumerate authorized agents and retrieve managed private keys.
- `grantCapability(...)`: Assign specific secret-use permissions to an agent.
- `exportSecret(...)`: Reveal a secret's plaintext (requires active authority).
- `readAudit(...)`: Access the append-only record of all vault actions.

## Agent Client (Consumer)

The `AgentClient` is used by delegated processes (e.g., LLMs or background workers) to perform authorized actions.

### Core Operations
- `dispatch(...)`: Use a granted capability to send a secret to an authorized target.
- **Security**: The agent never handles the vault's master password or the secret's plaintext.

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
