[**CBIO Node Runtime Agent API v1.63.7**](../README.md)

***

# Class: PersistentVaultSecretCustody

## Implements

- `SecretCustody`

## Constructors

### Constructor

> **new PersistentVaultSecretCustody**(`baseDir`, `workingKey`): `FileSecretCustody`

#### Parameters

##### baseDir

`string`

##### workingKey

`string`

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

`SecretCustody.delete`

***

### load()

> **load**(`secretId`): `Promise`\<`string` \| `null`\>

#### Parameters

##### secretId

[`SecretId`](../interfaces/SecretId.md)

#### Returns

`Promise`\<`string` \| `null`\>

#### Implementation of

`SecretCustody.load`

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

`SecretCustody.store`
