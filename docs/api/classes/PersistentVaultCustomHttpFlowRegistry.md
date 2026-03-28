[**CBIO Node Runtime Agent API v1.63.5**](../README.md)

***

# Class: PersistentVaultCustomHttpFlowRegistry

## Implements

- `CustomHttpFlowRegistry`

## Constructors

### Constructor

> **new PersistentVaultCustomHttpFlowRegistry**(`baseDir`): `FileCustomHttpFlowRegistry`

#### Parameters

##### baseDir

`string`

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

`CustomHttpFlowRegistry.get`

***

### register()

> **register**(`flow`): `Promise`\<`void`\>

#### Parameters

##### flow

[`CustomHttpFlowDefinition`](../interfaces/CustomHttpFlowDefinition.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`CustomHttpFlowRegistry.register`
