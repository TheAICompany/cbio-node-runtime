[**CBIO Node Runtime Agent API v1.73.0**](../README.md)

***

# Interface: OwnerSession

## Properties

### nickname?

> `readonly` `optional` **nickname?**: `string`

***

### storage

> `readonly` **storage**: [`IStorageProvider`](IStorageProvider.md)

***

### vault\_id

> `readonly` **vault\_id**: `string`

## Methods

### getOwnerClient()

> **getOwnerClient**(): `Promise`\<[`OwnerClient`](OwnerClient.md)\>

#### Returns

`Promise`\<[`OwnerClient`](OwnerClient.md)\>

***

### getVault()

> **getVault**(): `Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

#### Returns

`Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

***

### invalidate()

> **invalidate**(): `void`

#### Returns

`void`

***

### isValid()

> **isValid**(): `boolean`

#### Returns

`boolean`

***

### reloadVault()

> **reloadVault**(): `Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

#### Returns

`Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

***

### withOwnerClient()

> **withOwnerClient**\<`T`\>(`callback`): `Promise`\<`T`\>

#### Type Parameters

##### T

`T`

#### Parameters

##### callback

(`client`, `vault`) => `T` \| `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>
