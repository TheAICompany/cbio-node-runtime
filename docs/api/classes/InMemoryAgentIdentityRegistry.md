[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: InMemoryAgentIdentityRegistry

## Implements

- [`AgentIdentityRegistry`](../interfaces/AgentIdentityRegistry.md)

## Constructors

### Constructor

> **new InMemoryAgentIdentityRegistry**(): `InMemoryAgentIdentityRegistry`

#### Returns

`InMemoryAgentIdentityRegistry`

## Methods

### get()

> **get**(`vaultId`, `agentId`): `Promise`\<[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### agentId

`string`

#### Returns

`Promise`\<[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md) \| `null`\>

#### Implementation of

[`AgentIdentityRegistry`](../interfaces/AgentIdentityRegistry.md).[`get`](../interfaces/AgentIdentityRegistry.md#get)

***

### list()

> **list**(`vaultId`): `Promise`\<readonly [`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)[]\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

#### Returns

`Promise`\<readonly [`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)[]\>

#### Implementation of

[`AgentIdentityRegistry`](../interfaces/AgentIdentityRegistry.md).[`list`](../interfaces/AgentIdentityRegistry.md#list)

***

### register()

> **register**(`identity`): `Promise`\<`void`\>

#### Parameters

##### identity

[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`AgentIdentityRegistry`](../interfaces/AgentIdentityRegistry.md).[`register`](../interfaces/AgentIdentityRegistry.md#register)
