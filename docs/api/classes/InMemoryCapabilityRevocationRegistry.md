[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: InMemoryCapabilityRevocationRegistry

## Implements

- [`CapabilityRevocationRegistry`](../interfaces/CapabilityRevocationRegistry.md)

## Constructors

### Constructor

> **new InMemoryCapabilityRevocationRegistry**(): `InMemoryCapabilityRevocationRegistry`

#### Returns

`InMemoryCapabilityRevocationRegistry`

## Methods

### get()

> **get**(`vaultId`, `agentId`, `capabilityId`): `number`

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### agentId

`string`

##### capabilityId

`string`

#### Returns

`number`

#### Implementation of

[`CapabilityRevocationRegistry`](../interfaces/CapabilityRevocationRegistry.md).[`get`](../interfaces/CapabilityRevocationRegistry.md#get)

***

### revoke()

> **revoke**(`vaultId`, `agentId`, `capabilityId`): `number`

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### agentId

`string`

##### capabilityId

`string`

#### Returns

`number`

#### Implementation of

[`CapabilityRevocationRegistry`](../interfaces/CapabilityRevocationRegistry.md).[`revoke`](../interfaces/CapabilityRevocationRegistry.md#revoke)
