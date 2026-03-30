[**CBIO Node Runtime Agent API v1.69.0**](../README.md)

***

# Class: PersistentVaultSecretCustody

## Implements

- `SecretCustody`

## Constructors

### Constructor

> **new PersistentVaultSecretCustody**(`db`, `workingKeyHex`): `SqliteSecretCustody`

#### Parameters

##### db

`Database`

##### workingKeyHex

`string`

#### Returns

`SqliteSecretCustody`

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
