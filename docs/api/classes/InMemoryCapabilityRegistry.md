[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: InMemoryCapabilityRegistry

## Implements

- [`CapabilityRegistry`](../interfaces/CapabilityRegistry.md)

## Constructors

### Constructor

> **new InMemoryCapabilityRegistry**(): `InMemoryCapabilityRegistry`

#### Returns

`InMemoryCapabilityRegistry`

## Methods

### get()

> **get**(`vaultId`, `agentId`, `capabilityId`): `Promise`\<[`AgentCapability`](../interfaces/AgentCapability.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### agentId

`string`

##### capabilityId

`string`

#### Returns

`Promise`\<[`AgentCapability`](../interfaces/AgentCapability.md) \| `null`\>

#### Implementation of

[`CapabilityRegistry`](../interfaces/CapabilityRegistry.md).[`get`](../interfaces/CapabilityRegistry.md#get)

***

### list()

> **list**(`vaultId`, `agentId?`): `Promise`\<readonly [`AgentCapability`](../interfaces/AgentCapability.md)[]\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### agentId?

`string`

#### Returns

`Promise`\<readonly [`AgentCapability`](../interfaces/AgentCapability.md)[]\>

#### Implementation of

[`CapabilityRegistry`](../interfaces/CapabilityRegistry.md).[`list`](../interfaces/CapabilityRegistry.md#list)

***

### register()

> **register**(`capability`): `Promise`\<`void`\>

#### Parameters

##### capability

[`AgentCapability`](../interfaces/AgentCapability.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`CapabilityRegistry`](../interfaces/CapabilityRegistry.md).[`register`](../interfaces/CapabilityRegistry.md#register)
