[**CBIO Node Runtime Agent API v1.63.6**](../README.md)

***

# Interface: AgentRuntimeManifest

## Properties

### agent

> **agent**: `AgentSelfContext`

***

### grants

> **grants**: `object`

#### agentSecrets

> **agentSecrets**: readonly [`AgentSecretGrant`](AgentSecretGrant.md)[]

#### secretDestinations

> **secretDestinations**: readonly [`SecretDestinationGrant`](SecretDestinationGrant.md)[]

***

### issuedAt

> **issuedAt**: `string`

***

### rootAgentId

> **rootAgentId**: `string`

***

### tools

> **tools**: readonly `VaultToolDefinition`[]

***

### vaultId

> **vaultId**: `string`

***

### vaultNickname?

> `optional` **vaultNickname?**: `string`
