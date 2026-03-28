# Migration Guide: v1.4x → v1.65 (Grant Model)

This guide documents the transition from the legacy "Capability" model to the new "Grant" model introduced in v1.65.0.

## Overview of Changes

The heavyweight `Grant` system has been removed in favor of two simple, context-free white-list tables:
1. **Agent-Secret Grants**: Who (Agent) can use What (Secret).
2. **Secret-Destination Grants**: Where (Secret) can be sent (Domain).

## API Changes

### 1. Renamed & Removed Methods

| Legacy Method (v1.4x) | New Method (v1.65+) | Notes |
| :--- | :--- | :--- |
| `ownerGrantGrant` | `ownerGrantAgentSecret` / `ownerGrantSecretDestination` | Now split into two discrete grant types. |
| `ownerRevokeGrant` | `ownerRevokeAgentSecret` / `ownerRevokeSecretDestination` | |
| `ownerListCapabilities` | `ownerListGrants` | Returns both types of grants. |
| `ownerApproveGrantRead` | (Internalized) | Response visibility is now simpler. |
| `ownerAllowAlways` | `ownerApproveDispatch(..., 'allow_and_grant')` | Integrated into the dispatch approval flow. |
| `ownerAllowOnce` | `ownerApproveDispatch(..., 'allow_once')` | Integrated into the dispatch approval flow. |

### 2. Decision Logic

The `DispatchApprovalDecision` has been standardized:
- `allow_once`: Execute the blocked dispatch without creating a permanent grant.
- `allow_and_grant`: Execute the dispatch AND provision the needed grants as a side-effect.
- `deny`: Reject the request.

## Storage Migration

The storage layout for authorization has changed:
- **Old**: `vaults/<id>_v1/capabilities.sealed`
- **New**: `vaults/<id>_v1/grants/agent_secrets/` and `vaults/<id>_v1/grants/secret_destinations/`

> [!IMPORTANT]
> Automatic migration of legacy grant records is NOT provided in the runtime core. It is recommended to re-authorize agents using the new "Zero-Configuration" HITL flow (Dispatch -> Approve & Grant).

## Runtime Export Changes (Breaking)

The `src/runtime/index.ts` entry point has been purged of all legacy terminology to ensure the public API remains clean and future-proof.

| Legacy Export (v1.4x) | New v1.65.1 Equivalent | Notes |
| :--- | :--- | :--- |
| `OwnerClient` | `OwnerClient` | The primary owner-side interface (retained name). |
| `CreateOwnerClientOptions` | `CreateOwnerClientOptions` | |
| `OwnerAgentView` | `AgentIdentityRecord` | Direct domain record. |
| `OwnerSecretView` | `AgentVisibleSecretRecord` | Direct domain record. |
| `OwnerPendingApprovalView` | `OwnerVisibleRequestRecord` | |
| `OwnerRequestSummaryView` | `OwnerVisibleRequestRecord` | |
| `OwnerRequestDetailView` | `OwnerRequestRecord` | |
| `wrapVaultCoreAsVaultService`| `createVaultService` | Unified factory in `vault-ingress`. |

### Ingress Utility Relocation
Several low-level utilities have been moved to dedicated files for better modularity:
- `AgentDispatchHttpTransport` is now exported from `@cbio/node-runtime/vault-ingress/remote-transport`
- `handleVaultHttpDispatch` and `handleVaultAgentControlHttp` are now exported from `@cbio/node-runtime/vault-ingress/server-utils`

> [!CAUTION]
> These are **HARD BREAKING CHANGES**. Legacy aliases are NOT provided. You must update your imports to use the new v1.65.1 terminology.
