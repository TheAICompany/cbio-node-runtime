[**CBIO Node Runtime Agent API v1.55.1**](../README.md)

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

> **vault**: `VaultService`

## Methods

### verifyPassword()

> **verifyPassword**(`password`): `Promise`\<`boolean`\>

#### Parameters

##### password

`string`

#### Returns

`Promise`\<`boolean`\>
