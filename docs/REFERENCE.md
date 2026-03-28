# CBIO Vault Runtime Reference (v1.65.1)

This document describes the current implemented runtime surface for the **Sovereign Vault**. 

## Primary API Surface

The v1.65.1 runtime centers on a streamlined **Grant-based** authorization model, providing a "Zero-Configuration" workflow for agents.

### Main Constructors and Entrypoints

- `createVault(...)` - Initialize a new vault using a master password.
- `recoverVault(...)` - Reopen an existing vault using its master password.
- `createOwnerClient(...)` - Create an administrative client (Owner).
- `createAgentClient(...)` - Create an agent client (Consumer).

## Identity and Access Control

### 1. Agent Identities
- `ownerCreateAgent(...)`: Provision a new agent identity and return a session token.
- `ownerListAgents()`: Enumerate all registered agents.

### 2. Grant Management (Access Control)
The system uses a domain-level white-list model:
- `ownerGrantAgentSecret(...)`: Authorize an agent to use a specific secret alias.
- `ownerGrantSecretDestination(...)`: Authorize a secret alias for a specific domain.
- `ownerRevokeAgentSecret(...)`: Remove agent-secret authorization.
- `ownerRevokeSecretDestination(...)`: Remove secret-domain authorization.
- `ownerListGrants(...)`: Review all active or pending grants.

### 3. Dispatch and Approval (HITL)
- `agentDispatch(...)`: Attempt a secret-driven HTTP request. Returns `SUCCEEDED` or `PENDING`.
- `ownerListRequests(...)`: Review blocked (PENDING) or history of dispatches.
- `ownerApproveDispatch(...)`: Resolve a pending request.
    - `allow_once`: Execute once, no permanent change.
    - `allow_and_grant`: Execute and automatically provision permanent grants.
    - `deny`: Reject the request.

## Storage and Lifecycle

### Deployment Models
1. **Managed**: The runtime handles private keys internally.
2. **Session-based**: Agents use short-lived `sat_...` tokens issued by the owner.

### Storage Layout
- `profile.sealed`: Vault metadata.
- `secrets/`: Secret records.
- `custody/`: Secret plaintext.
- `agents/`: Agent records.
- `grants/agent_secrets/`: Agent-Secret white-list.
- `grants/secret_destinations/`: Secret-Domain white-list.
- `requests/`: Dispatch history and pending queue.
- `audit/`: Append-only audit trail.

## Build & Integration

Ensure you are using the latest distribution:
- `dist/runtime/index.js`
- `dist/runtime/index.d.ts`

For a full generated API reference, run:
```bash
npm run build:docs
```
