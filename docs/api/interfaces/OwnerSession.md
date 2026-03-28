[**CBIO Node Runtime Agent API v1.64.0**](../README.md)

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

### client()

> **client**(): `Promise`\<[`OwnerClient`](OwnerClient.md)\>

#### Returns

`Promise`\<[`OwnerClient`](OwnerClient.md)\>

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

### refresh()

> **refresh**(): `Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

#### Returns

`Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

***

### vault()

> **vault**(): `Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

#### Returns

`Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

***

### withClient()

> **withClient**\<`T`\>(`callback`): `Promise`\<`T`\>

#### Type Parameters

##### T

`T`

#### Parameters

##### callback

(`client`, `vault`) => `T` \| `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>
