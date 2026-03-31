[**CBIO Node Runtime Agent API v1.75.4**](../README.md)

***

# Interface: VaultObject

## Extended by

- [`RecoveredVault`](RecoveredVault.md)

## Properties

### core

> **core**: [`VaultCore`](../classes/VaultCore.md)

***

### nickname?

> `optional` **nickname?**: `string`

***

### storage

> **storage**: [`IStorageProvider`](IStorageProvider.md)

***

### vault

> **vault**: [`VaultService`](VaultService.md)

## Methods

### verifyPassword()

> **verifyPassword**(`password`): `Promise`\<`boolean`\>

#### Parameters

##### password

`string`

#### Returns

`Promise`\<`boolean`\>
