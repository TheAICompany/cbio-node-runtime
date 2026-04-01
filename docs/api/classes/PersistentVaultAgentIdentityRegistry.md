[**CBIO Node Runtime Agent API v1.76.1**](../README.md)

***

# Class: PersistentVaultAgentIdentityRegistry

## Implements

- `AgentIdentityRegistry`

## Constructors

### Constructor

> **new PersistentVaultAgentIdentityRegistry**(`db`, `custody`): `SqliteAgentIdentityRegistry`

#### Parameters

##### db

`Database`

##### custody

`SecretCustody`

#### Returns

`SqliteAgentIdentityRegistry`

## Methods

### delete()

> **delete**(`vault_id`, `root_agent_id`): `Promise`\<`void`\>

#### Parameters

##### vault\_id

`string`

##### root\_agent\_id

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`AgentIdentityRegistry.delete`

***

### get()

> **get**(`vault_id`, `root_agent_id`): `Promise`\<[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md) \| `null`\>

#### Parameters

##### vault\_id

`string`

##### root\_agent\_id

`string`

#### Returns

`Promise`\<[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md) \| `null`\>

#### Implementation of

`AgentIdentityRegistry.get`

***

### list()

> **list**(`vault_id`): `Promise`\<readonly [`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)[]\>

#### Parameters

##### vault\_id

`string`

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
