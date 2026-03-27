[**CBIO Node Runtime Agent API v1.61.0**](../README.md)

***

# Interface: OwnerSession

## Properties

### nickname?

> `readonly` `optional` **nickname?**: `string`

***

### storage

> `readonly` **storage**: [`IStorageProvider`](IStorageProvider.md)

***

### vaultId

> `readonly` **vaultId**: `string`

## Methods

### client()

> **client**(): `Promise`\<[`VaultClient`](VaultClient.md)\>

#### Returns

`Promise`\<[`VaultClient`](VaultClient.md)\>

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
