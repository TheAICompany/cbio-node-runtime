# Architecture (v1.47.0)

The cbio runtime follows a **Sovereign Vault** architecture: a unified, authority-centric model where security is grounded in proof-of-knowledge (passwords) rather than external identity hierarchies.

## Core Principles

1. **Authority via Password**: Administrative control is granted by unlocking the vault with its master password.
2. **Unified Storage**: All vault state (secrets, metadata, registries) is stored in a single encrypted partition.
3. **Managed Agency**: The vault can act as a custodian for its agents, managing their identity material internally.
4. **Process Isolation**: Sensitive cryptographic operations are physically separated from agent execution environments.

## Identity and Roles

The runtime distinguishes between administrative authority and delegated agency:

- **`vault-master` (Role)**: The implicit administrative role held by anyone who successfully unlocks the vault.
- **`agent` (Role)**: A delegated principal with specific capabilities.
- **Managed Identity**: An identity whose private keys are stored within the vault.
- **External Identity**: An identity represented by a public key, with private keys managed externally.

## Components

- **`vault-core`**: The secure engine. Stores secret plaintext, validates transactions, and maintains the audit log.
- **`clients/owner`**: The administrative interface. Used for writing secrets, managing agents, and exporting material.
- **`clients/agent`**: The consumer interface. Used by agents to request signed dispatches without ever seeing secret plaintext.
- **`vault-ingress`**: The protocol layer that resolves capabilities and handles incoming requests.

## Unified Storage Layout

All vault data is stored under a single prefix: `vaults/<vault-id>/`.
- **`vault/sealed/profile.sealed`**: Contains all vault metadata (nickname, owner ID, etc.).
- **`vault/sealed/secrets.sealed`**: Contains the encrypted secret registry.
- **`vault/sealed/custody/`**: Contains the physical secret shards.
- **`vault/sealed/identities/`**: Contains the agent identity registry (including managed private keys).

Everything in the `vault/sealed/` path is encrypted using the `vaultWorkingKey`, which is derived from the master password.

## Process Isolation (A/B Architecture)

To prevent secret leakage even in the case of agent compromise, the runtime is designed for process-level isolation:
- **Process A (Agent)**: Runs business logic/LLM. Holders a **Managed Identity** signer but has no access to the vault's working key.
- **Process B (Vault Server)**: Unlocks the vault and processes dispatch requests from Process A.

## Implementation Rules

1. **Locked by Default**: Before unlocking with a password, the vault reveals nothing but its ID.
2. **Secret Separation**: Plaintext secrets never leave the memory space of `vault-core`.
3. **Auditability**: Every action is bound to a principal (`vault-master` or `agent-id`) and recorded.
4. **Capability Gating**: Agents can only act on secrets for which they have an explicit, valid capability.
