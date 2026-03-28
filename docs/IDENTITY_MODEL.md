# Identity Model (v1.47.2)

This document defines the identity model for the **Sovereign Vault**. 

## Principle: Authority, Not Identity

The Sovereign Vault model simplifies the relationship between actors and the vault:

1. **Administrator (Owner)**: Authority is rooted in **knowledge of the master password**. There is no pre-registered `OwnerIdentity`. If you can unlock the vault, you are the master.
2. **Delegates (Agents)**: Identities authorized by the master to perform specific tasks.

## Identity Types

### 1. External Identity
A principal represented by a public/private keypair managed *outside* the vault. These are registered by providing a public key.

### 2. Managed Identity (New in v1.47.0)
An identity whose public/private keypair is generated and stored **inside** the vault. 
- The vault acts as the custodian of the private key.
- This is the preferred model for preventing lost keys in isolated agent processes.
- **Session Tokens**: Managed identities can be accessed via revocable session tokens (`sat_...`), allowing agents to authenticate without holding the private key in memory.

## Identifying Principals

### Root Agent ID
A stable, public-key-derived identifier (via `deriveRootAgentId(...)`). 
- Used for internal registries, grant assignment, and audit logs.
- Decoupled from human-readable labels.

### Nicknames
Human-friendly labels (e.g., "Main Worker", "Auth Service"). 
- Stored as metadata within the registry.
- Purely for display and audit traceability.

## Vault Role: "vault-master"

All administrative operations performed by the password-holder are recorded under the special principal **`vault-master`**. 

## What was Removed

To achieve the Sovereign Vault's simplicity, the following legacy concepts were removed:
- **Child Identities**: Deterministic derivation of keys from a parent identity is no longer supported. Use **Managed Identities** instead.
- **Identity-Private Vaults**: Every identity used to have its own encrypted "mini-vault". This has been replaced by the unified storage of the Sovereign Vault.

## Relationship Summary

| Actor | Source of Authority | Registry |
| :--- | :--- | :--- |
| **Owner** | Master Password | Implicit (via Unlock) |
| **Managed Agent** | Vault Registry (Internal Key) | `rootAgentIdentities` registry |
| **External Agent** | External Signer (Public Key) | `rootAgentIdentities` registry |
