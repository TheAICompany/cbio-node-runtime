[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: PersistentVaultCustomHttpFlowRegistry

## Implements

- [`CustomHttpFlowRegistry`](../interfaces/CustomHttpFlowRegistry.md)

## Constructors

### Constructor

> **new PersistentVaultCustomHttpFlowRegistry**(`storage`, `vaultWorkingKey`, `key?`, `_lockKey?`): `FileCustomHttpFlowRegistry`

#### Parameters

##### storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

##### vaultWorkingKey

`string`

##### key?

`string` = `"vault/sealed/custom-flows.sealed"`

##### \_lockKey?

`string` = `"vault/sealed/locks/custom-flows"`

#### Returns

`FileCustomHttpFlowRegistry`

## Methods

### get()

> **get**(`vaultId`, `flowId`): `Promise`\<[`CustomHttpFlowDefinition`](../interfaces/CustomHttpFlowDefinition.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### flowId

`string`

#### Returns

`Promise`\<[`CustomHttpFlowDefinition`](../interfaces/CustomHttpFlowDefinition.md) \| `null`\>

#### Implementation of

[`CustomHttpFlowRegistry`](../interfaces/CustomHttpFlowRegistry.md).[`get`](../interfaces/CustomHttpFlowRegistry.md#get)

***

### register()

> **register**(`flow`): `Promise`\<`void`\>

#### Parameters

##### flow

[`CustomHttpFlowDefinition`](../interfaces/CustomHttpFlowDefinition.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`CustomHttpFlowRegistry`](../interfaces/CustomHttpFlowRegistry.md).[`register`](../interfaces/CustomHttpFlowRegistry.md#register)
