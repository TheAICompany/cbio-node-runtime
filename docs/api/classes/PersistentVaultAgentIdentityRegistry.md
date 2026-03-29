[**CBIO Node Runtime Agent API v1.69.0**](../README.md)

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

> **get**(`vault_id`, `root_agent_id`): `Promise`\<[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md) \| `null`\>

#### Parameters

##### vault\_id

[`VaultId`](../interfaces/VaultId.md)

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
