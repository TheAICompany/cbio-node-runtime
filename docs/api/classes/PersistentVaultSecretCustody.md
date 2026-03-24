[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: PersistentVaultSecretCustody

## Implements

- [`SecretCustody`](../interfaces/SecretCustody.md)

## Constructors

### Constructor

> **new PersistentVaultSecretCustody**(`_storage`, `_vaultWorkingKey`, `_keyPrefix?`): `FileSecretCustody`

#### Parameters

##### \_storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

##### \_vaultWorkingKey

`string`

##### \_keyPrefix?

`string` = `"vault/sealed/custody"`

#### Returns

`FileSecretCustody`

## Methods

### delete()

> **delete**(`secretId`): `Promise`\<`void`\>

#### Parameters

##### secretId

[`SecretId`](../interfaces/SecretId.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`SecretCustody`](../interfaces/SecretCustody.md).[`delete`](../interfaces/SecretCustody.md#delete)

***

### load()

> **load**(`secretId`): `Promise`\<`string` \| `null`\>

#### Parameters

##### secretId

[`SecretId`](../interfaces/SecretId.md)

#### Returns

`Promise`\<`string` \| `null`\>

#### Implementation of

[`SecretCustody`](../interfaces/SecretCustody.md).[`load`](../interfaces/SecretCustody.md#load)

***

### store()

> **store**(`secretId`, `plaintext`): `Promise`\<`void`\>

#### Parameters

##### secretId

[`SecretId`](../interfaces/SecretId.md)

##### plaintext

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`SecretCustody`](../interfaces/SecretCustody.md).[`store`](../interfaces/SecretCustody.md#store)
