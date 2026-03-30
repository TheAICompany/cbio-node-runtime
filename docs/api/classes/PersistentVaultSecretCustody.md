[**CBIO Node Runtime Agent API v1.73.0**](../README.md)

***

# Class: PersistentVaultSecretCustody

## Implements

- `SecretCustody`

## Constructors

### Constructor

> **new PersistentVaultSecretCustody**(`db`, `workingKey`): `SqliteSecretCustody`

#### Parameters

##### db

`Database`

##### workingKey

`string`

#### Returns

`SqliteSecretCustody`

## Methods

### delete()

> **delete**(`secret_id`): `Promise`\<`void`\>

#### Parameters

##### secret\_id

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SecretCustody.delete`

***

### load()

> **load**(`secret_id`): `Promise`\<`string` \| `null`\>

#### Parameters

##### secret\_id

`string`

#### Returns

`Promise`\<`string` \| `null`\>

#### Implementation of

`SecretCustody.load`

***

### store()

> **store**(`secret_id`, `plaintext`): `Promise`\<`void`\>

#### Parameters

##### secret\_id

`string`

##### plaintext

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SecretCustody.store`
