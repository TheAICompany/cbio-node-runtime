[**CBIO Node Runtime Agent API v1.63.5**](../README.md)

***

# Class: PersistentVaultAgentSecretGrantRegistry

## Implements

- `AgentSecretGrantRegistry`

## Constructors

### Constructor

> **new PersistentVaultAgentSecretGrantRegistry**(`baseDir`): `FileAgentSecretGrantRegistry`

#### Parameters

##### baseDir

`string`

#### Returns

`FileAgentSecretGrantRegistry`

## Methods

### delete()

> **delete**(`vaultId`, `rootAgentId`, `secretAlias`): `Promise`\<`void`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### rootAgentId

`string`

##### secretAlias

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`AgentSecretGrantRegistry.delete`

***

### get()

> **get**(`vaultId`, `rootAgentId`, `secretAlias`): `Promise`\<[`AgentSecretGrant`](../interfaces/AgentSecretGrant.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### rootAgentId

`string`

##### secretAlias

`string`

#### Returns

`Promise`\<[`AgentSecretGrant`](../interfaces/AgentSecretGrant.md) \| `null`\>

#### Implementation of

`AgentSecretGrantRegistry.get`

***

### list()

> **list**(`vaultId`, `rootAgentId?`): `Promise`\<readonly [`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)[]\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### rootAgentId?

`string`

#### Returns

`Promise`\<readonly [`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)[]\>

#### Implementation of

`AgentSecretGrantRegistry.list`

***

### upsert()

> **upsert**(`grant`): `Promise`\<`void`\>

#### Parameters

##### grant

[`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`AgentSecretGrantRegistry.upsert`
