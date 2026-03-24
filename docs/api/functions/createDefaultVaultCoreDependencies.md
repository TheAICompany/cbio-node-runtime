[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Function: createDefaultVaultCoreDependencies()

> **createDefaultVaultCoreDependencies**(`options?`): `object`

## Parameters

### options?

[`CreateDefaultVaultCoreDependenciesOptions`](../interfaces/CreateDefaultVaultCoreDependenciesOptions.md) = `{}`

## Returns

`object`

### agentIdentities

> **agentIdentities**: [`InMemoryAgentIdentityRegistry`](../classes/InMemoryAgentIdentityRegistry.md)

### audit

> **audit**: [`InMemoryAuditLog`](../classes/InMemoryAuditLog.md)

### capabilities

> **capabilities**: [`InMemoryCapabilityRegistry`](../classes/InMemoryCapabilityRegistry.md)

### clock

> **clock**: [`SystemClock`](../classes/SystemClock.md)

### custody

> **custody**: [`InMemorySecretCustody`](../classes/InMemorySecretCustody.md)

### customFlows

> **customFlows**: [`InMemoryCustomHttpFlowRegistry`](../classes/InMemoryCustomHttpFlowRegistry.md)

### executor

> **executor**: [`HttpDispatchExecutor`](../classes/HttpDispatchExecutor.md)

### ids

> **ids**: [`RandomIdGenerator`](../classes/RandomIdGenerator.md)

### ownerIdentities

> **ownerIdentities**: [`InMemoryOwnerIdentityRegistry`](../classes/InMemoryOwnerIdentityRegistry.md)

### ownerProofVerifier

> **ownerProofVerifier**: [`SignatureOwnerProofVerifier`](../classes/SignatureOwnerProofVerifier.md)

### policy

> **policy**: [`DefaultPolicyEngine`](../classes/DefaultPolicyEngine.md)

### proofVerifier

> **proofVerifier**: [`SignatureAgentProofVerifier`](../classes/SignatureAgentProofVerifier.md)

### replayGuard

> **replayGuard**: [`InMemoryReplayGuard`](../classes/InMemoryReplayGuard.md)

### secrets

> **secrets**: [`InMemorySecretRepository`](../classes/InMemorySecretRepository.md)

### vaultId

> **vaultId**: [`VaultId`](../interfaces/VaultId.md)
