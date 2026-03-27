# Architecture (v1.47.2)

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

All vault data is stored under a flat versioned prefix: `vaults/<vault-id>_v1/`.
- **`profile.sealed`**: Contains all vault metadata (nickname, owner ID, etc.).
- **`secrets.sealed`**: Contains the encrypted secret registry.
- **`agents.sealed`**: Contains the agent identity registry (including managed private keys).
- **`capabilities.sealed`**: Contains granted capabilities.
- **`custom-flows.sealed`**: Contains registered owner-defined HTTP request templates.
- **`audit.jsonl`**: Contains the tamper-evident audit log.
- **`working-key.sealed`**: Contains the sealed vault working key custody blob.
- **`secret-<secret-id>.sealed`**: Contains encrypted secret material blobs.

The `_v1` suffix is the storage-layout version. Future layout changes should increment this suffix rather than adding deeper wrapper directories.

## Process Isolation (A/B Architecture)

To prevent secret leakage even in the case of agent compromise, the runtime is designed for process-level isolation:
- **Process A (Agent)**: Runs business logic/LLM. Authenticates via **Session Tokens** (or Managed Identity signers) but has no access to the vault's working key.
- **Process B (Vault Server)**: Unlocks the vault, issues/revokes tokens, and processes dispatch requests from Process A.

## Implementation Rules

1. **Locked by Default**: Before unlocking with a password, the vault reveals nothing but its ID.
2. **Secret Separation**: Plaintext secrets never leave the memory space of `vault-core`.
3. **Auditability**: Every action is bound to a principal (`vault-master` or `agent-id`) and recorded.
4. **Capability Gating**: Agents can only act on secrets for which they have an explicit, valid capability.
