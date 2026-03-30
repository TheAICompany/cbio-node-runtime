[**CBIO Node Runtime Agent API v1.74.0**](../README.md)

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
