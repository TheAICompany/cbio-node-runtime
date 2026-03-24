[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: PersistentVaultOwnerIdentityRegistry

## Implements

- [`OwnerIdentityRegistry`](../interfaces/OwnerIdentityRegistry.md)

## Constructors

### Constructor

> **new PersistentVaultOwnerIdentityRegistry**(`storage`, `vaultWorkingKey`, `key?`, `_lockKey?`): `FileOwnerIdentityRegistry`

#### Parameters

##### storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

##### vaultWorkingKey

`string`

##### key?

`string` = `"vault/sealed/identities/owners.sealed"`

##### \_lockKey?

`string` = `"vault/sealed/locks/owner-identities"`

#### Returns

`FileOwnerIdentityRegistry`

## Methods

### get()

> **get**(`vaultId`, `ownerId`): `Promise`\<[`OwnerIdentityRecord`](../interfaces/OwnerIdentityRecord.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### ownerId

`string`

#### Returns

`Promise`\<[`OwnerIdentityRecord`](../interfaces/OwnerIdentityRecord.md) \| `null`\>

#### Implementation of

[`OwnerIdentityRegistry`](../interfaces/OwnerIdentityRegistry.md).[`get`](../interfaces/OwnerIdentityRegistry.md#get)

***

### hasAny()

> **hasAny**(`vaultId`): `Promise`\<`boolean`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`OwnerIdentityRegistry`](../interfaces/OwnerIdentityRegistry.md).[`hasAny`](../interfaces/OwnerIdentityRegistry.md#hasany)

***

### register()

> **register**(`identity`): `Promise`\<`void`\>

#### Parameters

##### identity

[`OwnerIdentityRecord`](../interfaces/OwnerIdentityRecord.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerIdentityRegistry`](../interfaces/OwnerIdentityRegistry.md).[`register`](../interfaces/OwnerIdentityRegistry.md#register)
