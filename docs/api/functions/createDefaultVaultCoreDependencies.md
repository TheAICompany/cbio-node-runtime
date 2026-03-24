[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Function: createDefaultVaultCoreDependencies()

> **createDefaultVaultCoreDependencies**(`options?`): `object`

## Parameters

### options?

[`CreateDefaultVaultCoreDependenciesOptions`](../interfaces/CreateDefaultVaultCoreDependenciesOptions.md) = `{}`

## Returns

`object`

### agentIdentities

> **agentIdentities**: `InMemoryAgentIdentityRegistry`

### audit

> **audit**: `InMemoryAuditLog`

### capabilities

> **capabilities**: `InMemoryCapabilityRegistry`

### clock

> **clock**: `SystemClock`

### custody

> **custody**: `InMemorySecretCustody`

### customFlows

> **customFlows**: `InMemoryCustomHttpFlowRegistry`

### executor

> **executor**: `HttpDispatchExecutor`

### ids

> **ids**: `RandomIdGenerator`

### ownerIdentities

> **ownerIdentities**: `InMemoryOwnerIdentityRegistry`

### ownerProofVerifier

> **ownerProofVerifier**: `SignatureOwnerProofVerifier`

### policy

> **policy**: `DefaultPolicyEngine`

### proofVerifier

> **proofVerifier**: `SignatureAgentProofVerifier`

### replayGuard

> **replayGuard**: [`InMemoryReplayGuard`](../classes/InMemoryReplayGuard.md)

### secrets

> **secrets**: `InMemorySecretRepository`

### vaultId

> **vaultId**: [`VaultId`](../interfaces/VaultId.md)
