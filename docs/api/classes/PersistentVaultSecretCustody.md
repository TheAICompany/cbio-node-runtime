[**CBIO Node Runtime Agent API v1.68.0**](../README.md)

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

> **delete**(`secret_id`): `Promise`\<`void`\>

#### Parameters

##### secret\_id

[`SecretId`](../interfaces/SecretId.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SecretCustody.delete`

***

### load()

> **load**(`secret_id`): `Promise`\<`string` \| `null`\>

#### Parameters

##### secret\_id

[`SecretId`](../interfaces/SecretId.md)

#### Returns

`Promise`\<`string` \| `null`\>

#### Implementation of

`SecretCustody.load`

***

### store()

> **store**(`secret_id`, `plaintext`): `Promise`\<`void`\>

#### Parameters

##### secret\_id

[`SecretId`](../interfaces/SecretId.md)

##### plaintext

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SecretCustody.store`
