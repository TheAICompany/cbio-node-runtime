# Custody Model (v1.47.0)

This document defines the **Sovereign Vault** custody model for the local vault runtime.

## Scope

The runtime is an authority-centric "password safe" style infrastructure. It is responsible for:
- Storing secret material safely at rest.
- Providing a **Managed Custody** home for agent identities.
- Centering all administrative authority on a master password.

## Design Goals

1. **Authority via Proof of Knowledge**: Access to the vault's root secrets depends on knowing the master password.
2. **Managed Agency**: The vault can generate and store private keys for its agents, removing the need for external key management by delegated actors.
3. **Internalized Identity**: Administrative "Ownership" is a byproduct of unlocking the vault, not a pre-registered cryptographic identity.

## Core Keys

### Master Password
The root of all authority. Used to derive the `vaultWorkingKey`.

### `vaultWorkingKey`
The runtime's internal encryption key for all stored material (secrets and registries).
- **Derivation**: Derived from the Master Password + `vaultId` using `scrypt` (KDF).
- **Purpose**: Protects the vault profile, secret custody, and agent registries at rest.

### Managed Agent Keys
Standard Ed25519 private keys generated and stored *inside* the vault.
- **Purpose**: Allow agents to sign requests for dispatch without the agent process ever needing to persist its own identity material.

## Required Separation

The runtime enforces a hard process boundary (A/B Architecture):
1. **Security Process (A)**: Holds the Master Password and performs all crypto operations on the `vaultWorkingKey`.
2. **Agent Process (B)**: Receives a "Managed Identity" (provided by A) to perform authorized dispatches.

## Export / Reveal Policy

Exporting secret plaintext is a first-class capability of the Sovereign Vault.
- `exportSecret(...)` is a valid, audited administrative operation.
- Requires the vault to be in an unlocked (operational) state.

## Conclusion

The Sovereign Vault model prioritizes **Ease of Use** and **Security through Isolation**. By moving away from complex external identity hierarchies, it provides a stable, "password-manager" style experience for automated agency.
