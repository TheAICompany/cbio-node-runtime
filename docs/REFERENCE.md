# CBIO Vault Runtime Reference (v1.72.0)

This document describes the current implemented runtime surface for the **Vault**. 

## Primary API Surface

The v1.72.0 runtime centers on a streamlined **Grant-based** authorization model and a **Unified ID Architecture**, providing a "Zero-Configuration" workflow for agents.

### Main Constructors and Entrypoints

- `createVault(...)` - Initialize a new vault using a master password. Supports automatic memory-only fallback.
- `recoverVault(...)` - Reopen an existing vault using its master password.
- `createOwnerClient(...)` - Create an administrative client (Owner).
- `createAgentClient(...)` - Create an agent client (Consumer).

## Identity and Access Control

### 0. Secret Management

Alias namespaces are **globally unique** within a Vault. Secrets are managed with strict, predictable semantics:

| Method | Must already exist? | If duplicate alias? | Batch support? |
|---|---|---|---|
| `ownerCreateSecret` | No (must be new) | ❌ throws `VAULT_ALIAS_ALREADY_EXISTS` | ✅ Atomic |
| `ownerUpdateSecret` | Yes (must exist) | N/A | ✅ Atomic |
| `ownerRemoveSecret` | Yes (must exist) | N/A | No |

**Batch atomicity**: When an array is passed, all preconditions are verified first. If any check fails, nothing is written.

### 1. Agent Identities
- `ownerCreateAgent(...)`: Provision a new agent identity and return a session token.
- `ownerListAgents()`: Enumerate all registered agents.

### 2. Grant Management (Access Control)
The system uses a domain-level white-list model. All grants are bound to the underlying stable `secret_id` (UUID), making them resilient to secret renames.

- `ownerGrantAgentSecret(...)`: Authorize an agent to use a specific secret.
- `ownerGrantSecretDestination(...)`: Authorize a secret for a specific domain.
- `ownerRevokeAgentSecret(...)`: Remove agent-secret authorization.
- `ownerRevokeSecretDestination(...)`: Remove secret-domain authorization.
- `ownerListGrants(...)`: Review all active or pending grants.

### 3. Dispatch and Approval (HITL)
- `agentDispatch(...)`: Attempt a secret-driven HTTP request. Returns `SUCCEEDED`, `DENIED`, `FAILED`, or `AWAITING_APPROVAL`.
- `ownerListRequests(...)`: Review approval-waiting (`AWAITING_APPROVAL`) or historical dispatches.
- `ownerOnAudit({ afterEventId, function_names, root_agent_id, request_id, onEvent })`: Subscribe to the append-only audit log.
- `ownerOnPendingDispatch({ afterEventId, onEvent })`: Subscribe to persisted pending-dispatch events.
- `handleVaultAuditSse(vault, { afterEventId, function_names, root_agent_id, request_id, signal })`: Bridge the audit log to browser or cross-process consumers over SSE.
- `ownerApproveDispatch(...)`: Resolve a pending request.

## Storage and Lifecycle

### 1. Managed Identity
The runtime handles private keys internally. Key material for agents is stored in the encrypted `custody` table of the vault.

### 2. Unified ID Architecture
All identifiers are managed as native `string` types:
- `VaultId`: `vault_...` (UUID)
- `SecretId`: `secret_...` (UUID)
- `AgentId`: `agt_...` (root_agent_id)

### 3. Fact-Based Audit Log
The audit log records objective facts about function calls. Instead of high-level operation types, it logs the `function_name` and the associated ID parameters.

---

## Build & Integration

Ensure you are using the latest distribution:
- `dist/runtime/index.js`
- `dist/runtime/index.d.ts`

For a full generated API reference, run:
```bash
npm run build:docs
```
