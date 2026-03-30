[**CBIO Node Runtime Agent API v1.69.0**](../README.md)

***

# Class: PersistentVaultAgentSecretGrantRegistry

## Implements

- `AgentSecretGrantRegistry`

## Constructors

### Constructor

> **new PersistentVaultAgentSecretGrantRegistry**(`db`): `SqliteAgentSecretGrantRegistry`

#### Parameters

##### db

`Database`

#### Returns

`SqliteAgentSecretGrantRegistry`

## Methods

### delete()

> **delete**(`vault_id`, `root_agent_id`, `secret_alias`): `Promise`\<`void`\>

#### Parameters

##### vault\_id

[`VaultId`](../interfaces/VaultId.md)

##### root\_agent\_id

`string`

##### secret\_alias

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`AgentSecretGrantRegistry.delete`

***

### get()

> **get**(`vault_id`, `root_agent_id`, `secret_alias`): `Promise`\<[`AgentSecretGrant`](../interfaces/AgentSecretGrant.md) \| `null`\>

#### Parameters

##### vault\_id

[`VaultId`](../interfaces/VaultId.md)

##### root\_agent\_id

`string`

##### secret\_alias

`string`

#### Returns

`Promise`\<[`AgentSecretGrant`](../interfaces/AgentSecretGrant.md) \| `null`\>

#### Implementation of

`AgentSecretGrantRegistry.get`

***

### list()

> **list**(`vault_id`, `root_agent_id?`): `Promise`\<readonly [`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)[]\>

#### Parameters

##### vault\_id

[`VaultId`](../interfaces/VaultId.md)

##### root\_agent\_id?

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
