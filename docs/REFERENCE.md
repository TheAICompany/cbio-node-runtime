# CBIO Vault Runtime Reference (v1.65.2)

This document describes the current implemented runtime surface for the **Vault**. 

## Primary API Surface

The v1.65.1 runtime centers on a streamlined **Grant-based** authorization model, providing a "Zero-Configuration" workflow for agents.

### Main Constructors and Entrypoints

- `createVault(...)` - Initialize a new vault using a master password.
- `recoverVault(...)` - Reopen an existing vault using its master password.
- `createOwnerClient(...)` - Create an administrative client (Owner).
- `createAgentClient(...)` - Create an agent client (Consumer).

## Identity and Access Control

## Identity and Access Control

### 0. Secret Management

Alias namespaces are **globally unique** within a Vault. Secrets are managed with strict, predictable semantics:

| Method | Must already exist? | If duplicate alias? | Batch support? |
|---|---|---|---|
| `ownerCreateSecret` | No (must be new) | ❌ throws `VAULT_ALIAS_ALREADY_EXISTS` | ✅ Atomic |
| `ownerUpdateSecret` | Yes (must exist) | N/A | ✅ Atomic |
| `ownerRemoveSecret` | Yes (must exist) | N/A | No |

**Batch atomicity**: When an array is passed, all preconditions are verified first. If any check fails, nothing is written.

```ts
// Single
await client.ownerCreateSecret({ alias: 'key', plaintext: '...' });

// Batch — atomic: all-or-nothing
await client.ownerCreateSecret([
  { alias: 'key-a', plaintext: '...' },
  { alias: 'key-b', plaintext: '...' },
]);
```

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
- `agentDispatch(...)`: Attempt a secret-driven HTTP request. Returns `SUCCEEDED`, `DENIED`, `FAILED`, or `AWAITING_APPROVAL`.
- `ownerListRequests(...)`: Review approval-waiting (`AWAITING_APPROVAL`) or historical dispatches.
- `ownerOnAudit({ afterEventId, operations, root_agent_id, request_id, onEvent })`: Subscribe to the append-only audit log. The log is the notification source; consumers should re-query authoritative data after receiving an entry.
- `ownerOnPendingDispatch({ afterEventId, onEvent })`: Subscribe to persisted pending-dispatch events. Each event includes an `event_id` cursor plus the underlying request record, so consumers can resume after reconnecting.
- `handleVaultAuditSse(vault, { afterEventId, operations, root_agent_id, request_id, signal })`: Bridge the audit log to browser or cross-process consumers over SSE.
- `handleVaultPendingDispatchSse(vault, { afterEventId, signal })`: Bridge pending-dispatch events to browser or cross-process consumers over SSE.
- `ownerApproveDispatch(...)`: Resolve a pending request.
    - `allow_once`: Execute once, no permanent change.
    - `allow_and_grant`: Execute and automatically provision permanent grants.
    - `deny`: Reject the request.

## Storage and Lifecycle

### Deployment Models
1. **Managed**: The runtime handles private keys internally.
2. **Session-based**: Agents use revocable `sat_...` session tokens issued by the owner. In the default in-memory runtime, each agent has exactly one current token at a time.

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
