[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: AgentIdentityRegistry

## Methods

### get()

> **get**(`vaultId`, `agentId`): `Promise`\<[`AgentIdentityRecord`](AgentIdentityRecord.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](VaultId.md)

##### agentId

`string`

#### Returns

`Promise`\<[`AgentIdentityRecord`](AgentIdentityRecord.md) \| `null`\>

***

### list()

> **list**(`vaultId`): `Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

#### Parameters

##### vaultId

[`VaultId`](VaultId.md)

#### Returns

`Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

***

### register()

> **register**(`identity`): `Promise`\<`void`\>

#### Parameters

##### identity

[`AgentIdentityRecord`](AgentIdentityRecord.md)

#### Returns

`Promise`\<`void`\>
