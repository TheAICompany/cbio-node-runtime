[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

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

> **agentIdentities**: [`PersistentVaultAgentIdentityRegistry`](../classes/PersistentVaultAgentIdentityRegistry.md)

### audit

> **audit**: [`PersistentVaultAuditLog`](../classes/PersistentVaultAuditLog.md)

### capabilities

> **capabilities**: [`PersistentVaultCapabilityRegistry`](../classes/PersistentVaultCapabilityRegistry.md)

### capabilityRevocations

> **capabilityRevocations**: [`CapabilityRevocationRegistry`](../interfaces/CapabilityRevocationRegistry.md)

### clock

> **clock**: [`SystemClock`](../classes/SystemClock.md)

### custody

> **custody**: [`PersistentVaultSecretCustody`](../classes/PersistentVaultSecretCustody.md)

### customFlows

> **customFlows**: [`CustomHttpFlowRegistry`](../interfaces/CustomHttpFlowRegistry.md)

### executor

> **executor**: [`HttpDispatchExecutor`](../classes/HttpDispatchExecutor.md)

### ids

> **ids**: [`RandomIdGenerator`](../classes/RandomIdGenerator.md)

### ownerIdentities

> **ownerIdentities**: [`PersistentVaultOwnerIdentityRegistry`](../classes/PersistentVaultOwnerIdentityRegistry.md)

### ownerProofVerifier

> **ownerProofVerifier**: [`SignatureOwnerProofVerifier`](../classes/SignatureOwnerProofVerifier.md)

### policy

> **policy**: [`DefaultPolicyEngine`](../classes/DefaultPolicyEngine.md)

### proofVerifier

> **proofVerifier**: [`SignatureAgentProofVerifier`](../classes/SignatureAgentProofVerifier.md)

### replayGuard

> **replayGuard**: [`ReplayGuard`](../interfaces/ReplayGuard.md)

### secrets

> **secrets**: [`PersistentVaultSecretRepository`](../classes/PersistentVaultSecretRepository.md)

### vaultId

> **vaultId**: [`VaultId`](../interfaces/VaultId.md)
