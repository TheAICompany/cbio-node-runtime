[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: PersistentVaultCapabilityRevocationRegistry

## Implements

- [`CapabilityRevocationRegistry`](../interfaces/CapabilityRevocationRegistry.md)

## Constructors

### Constructor

> **new PersistentVaultCapabilityRevocationRegistry**(`storage`, `vaultWorkingKey`, `key?`, `_lockKey?`): `FileCapabilityRevocationRegistry`

#### Parameters

##### storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

##### vaultWorkingKey

`string`

##### key?

`string` = `"vault/sealed/security/revocations.sealed"`

##### \_lockKey?

`string` = `"vault/sealed/locks/revocations"`

#### Returns

`FileCapabilityRevocationRegistry`

## Methods

### get()

> **get**(`vaultId`, `agentId`, `capabilityId`): `Promise`\<`number`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### agentId

`string`

##### capabilityId

`string`

#### Returns

`Promise`\<`number`\>

#### Implementation of

[`CapabilityRevocationRegistry`](../interfaces/CapabilityRevocationRegistry.md).[`get`](../interfaces/CapabilityRevocationRegistry.md#get)

***

### revoke()

> **revoke**(`vaultId`, `agentId`, `capabilityId`): `Promise`\<`number`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### agentId

`string`

##### capabilityId

`string`

#### Returns

`Promise`\<`number`\>

#### Implementation of

[`CapabilityRevocationRegistry`](../interfaces/CapabilityRevocationRegistry.md).[`revoke`](../interfaces/CapabilityRevocationRegistry.md#revoke)
