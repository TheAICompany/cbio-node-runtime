# Architecture (v1.72.0)

The cbio runtime follows a **Vault** architecture: a unified, authority-centric model where security is grounded in proof-of-knowledge (passwords) and a "Zero-Wrapper" unified ID system.

## Core Principles

1. **Authority via Password**: Administrative control is granted by unlocking the vault with its master password.
2. **Unified Storage**: All vault state (secrets, metadata, registries) is stored in a single encrypted partition.
3. **Unified ID Architecture**: All identifies (VaultId, SecretId, AgentId) are managed as native strings, eliminating redundant object wrappers.
4. **Managed Agency**: The vault acts as a custodian for its agents, managing their identity material internally.
5. **Process Isolation**: Sensitive cryptographic operations are physically separated from agent execution environments.
6. **Fact-Based Auditability**: The system logs objective facts (function calls and parameters) rather than opaque operation categories.
7. **Environment Resilience**: Native support for memory-only fallback when filesystem-backed storage is unavailable.

## Identity and Roles

The runtime distinguishes between administrative authority and delegated agency:

- **`vault-master` (Role)**: The implicit administrative role held by anyone who successfully unlocks the vault.
- **`agent` (Role)**: A delegated principal identified by a unique `AgentId` (a raw string).
- **Managed Identity**: An identity whose private keys are stored within the vault's encrypted custody.
- **External Identity**: An identity represented by a public key, with private keys managed externally.

## Components

- **`vault-core`**: The secure engine. Stores secret materials, validates transactions, and maintains the fact-based audit log.
- **`clients/owner`**: The administrative interface. Used for managing secrets, agents, and grants.
- **`clients/agent`**: The consumer interface. Used by agents to request signed dispatches and introspect their identity/grants.
- **`vault-ingress`**: The protocol layer that provides the entry points for external system integration.

## Simplified Authorization Model (Grants)

The system uses a streamlined **Grant** model:

1. **Agent-Secret Grants**: Authorize an agent to use a specific secret instance (identified internally by its stable `secret_id` UUID).
2. **Secret-Destination Grants**: Authorize a secret instance to be dispatched to a specific domain (e.g., `api.example.com`).

A dispatch is permitted only if **both** grants exist and are in `approved` status. Because grants are bound to the internal stable ID, renaming a secret alias does not invalidate existing permissions.

## Approval Flows

Two distinct approval contexts exist:

- **Dispatch Approval**: Triggered when a concrete dispatch is blocked. Decisions are made based on the specific request context (URL, Method, Reason).
- **Whitelist (Grant) Approval**: A strategic decision to trust an agent with a secret or a secret with a domain. 

The system supports an **Allow & Grant** shortcut in the Dispatch UI to bridge these two workflows for a "Zero-Configuration" experience.

## Storage Layout

All vault data is stored under a versioned prefix: `vaults/<vault-id>_v1/`.
- **`profile.json`**: (When sealed) Vault metadata.
- **`secrets/`**: Secret records indexed by ID and Alias.
- **`custody/`**: Sealed secret material (plaintext).
- **`agents/`**: Agent identity records.
- **`grants/agent_secrets/`**: White-list of agents authorized for specific secrets.
- **`grants/secret_destinations/`**: White-list of domains authorized for specific secrets.
- **`requests/`**: History of dispatches and pending approvals.
- **`audit/`**: Append-only fact log.

## Process Isolation (A/B Architecture)

To prevent secret leakage, the runtime is designed for physical separation:
- **Process A (Agent)**: Runs business logic/LLM. Authenticates via **Session Tokens** but never handles the master password or raw secrets.
- **Process B (Vault Server)**: Unlocks the vault and handles sensitive operations.

## Implementation Rules

1. **Locked by Default**: Before unlocking, the vault reveals nothing but its ID.
2. **Secret Separation**: Plaintext secrets never leave the memory space of `vault-core`.
3. **Fact-logging**: Every action is recorded as a function-call event bound to a principal.
4. **Grant Gating**: Agents can only act on secrets for which they have valid, approved grants.
