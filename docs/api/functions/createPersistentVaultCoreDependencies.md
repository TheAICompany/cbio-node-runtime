[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Function: createPersistentVaultCoreDependencies()

> **createPersistentVaultCoreDependencies**(`storage`, `options`): `object`

## Parameters

### storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

### options

[`CreatePersistentVaultCoreDependenciesOptions`](../interfaces/CreatePersistentVaultCoreDependenciesOptions.md)

## Returns

`object`

### agentIdentities

> **agentIdentities**: `FileAgentIdentityRegistry`

### audit

> **audit**: `FileAuditLog`

### capabilities

> **capabilities**: `FileCapabilityRegistry`

### capabilityRevocations

> **capabilityRevocations**: [`CapabilityRevocationRegistry`](../interfaces/CapabilityRevocationRegistry.md)

### clock

> **clock**: `SystemClock`

### custody

> **custody**: `FileSecretCustody`

### customFlows

> **customFlows**: [`CustomHttpFlowRegistry`](../interfaces/CustomHttpFlowRegistry.md)

### executor

> **executor**: `HttpDispatchExecutor`

### ids

> **ids**: `RandomIdGenerator`

### ownerIdentities

> **ownerIdentities**: `FileOwnerIdentityRegistry`

### ownerProofVerifier

> **ownerProofVerifier**: `SignatureOwnerProofVerifier`

### policy

> **policy**: `DefaultPolicyEngine`

### proofVerifier

> **proofVerifier**: `SignatureAgentProofVerifier`

### replayGuard

> **replayGuard**: [`ReplayGuard`](../interfaces/ReplayGuard.md)

### secrets

> **secrets**: `FileSecretRepository`

### vaultId

> **vaultId**: [`VaultId`](../interfaces/VaultId.md)
