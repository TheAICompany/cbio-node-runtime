[**CBIO Node Runtime Agent API v1.75.4**](../README.md)

***

# Interface: RecoveredVault

## Extends

- [`VaultObject`](VaultObject.md)

## Properties

### core

> **core**: [`VaultCore`](../classes/VaultCore.md)

#### Inherited from

[`VaultObject`](VaultObject.md).[`core`](VaultObject.md#core)

***

### nickname?

> `optional` **nickname?**: `string`

#### Inherited from

[`VaultObject`](VaultObject.md).[`nickname`](VaultObject.md#nickname)

***

### storage

> **storage**: [`IStorageProvider`](IStorageProvider.md)

#### Inherited from

[`VaultObject`](VaultObject.md).[`storage`](VaultObject.md#storage)

***

### vault

> **vault**: [`VaultService`](VaultService.md)

#### Inherited from

[`VaultObject`](VaultObject.md).[`vault`](VaultObject.md#vault)

## Methods

### verifyPassword()

> **verifyPassword**(`password`): `Promise`\<`boolean`\>

#### Parameters

##### password

`string`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

[`VaultObject`](VaultObject.md).[`verifyPassword`](VaultObject.md#verifypassword)
