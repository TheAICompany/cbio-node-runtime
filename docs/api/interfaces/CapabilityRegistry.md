[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: CapabilityRegistry

## Methods

### get()

> **get**(`vaultId`, `agentId`, `capabilityId`): `Promise`\<[`AgentCapability`](AgentCapability.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](VaultId.md)

##### agentId

`string`

##### capabilityId

`string`

#### Returns

`Promise`\<[`AgentCapability`](AgentCapability.md) \| `null`\>

***

### list()

> **list**(`vaultId`, `agentId?`): `Promise`\<readonly [`AgentCapability`](AgentCapability.md)[]\>

#### Parameters

##### vaultId

[`VaultId`](VaultId.md)

##### agentId?

`string`

#### Returns

`Promise`\<readonly [`AgentCapability`](AgentCapability.md)[]\>

***

### register()

> **register**(`capability`): `Promise`\<`void`\>

#### Parameters

##### capability

[`AgentCapability`](AgentCapability.md)

#### Returns

`Promise`\<`void`\>
