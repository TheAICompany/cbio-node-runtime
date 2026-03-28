[**CBIO Node Runtime Agent API v1.63.5**](../README.md)

***

# Class: PersistentVaultAgentIdentityRegistry

## Implements

- `AgentIdentityRegistry`

## Constructors

### Constructor

> **new PersistentVaultAgentIdentityRegistry**(`baseDir`): `FileAgentIdentityRegistry`

#### Parameters

##### baseDir

`string`

#### Returns

`FileAgentIdentityRegistry`

## Methods

### get()

> **get**(`vaultId`, `rootAgentId`): `Promise`\<[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### rootAgentId

`string`

#### Returns

`Promise`\<[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md) \| `null`\>

#### Implementation of

`AgentIdentityRegistry.get`

***

### list()

> **list**(`vaultId`): `Promise`\<readonly [`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)[]\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

#### Returns

`Promise`\<readonly [`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)[]\>

#### Implementation of

`AgentIdentityRegistry.list`

***

### register()

> **register**(`identity`): `Promise`\<`void`\>

#### Parameters

##### identity

[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`AgentIdentityRegistry.register`
