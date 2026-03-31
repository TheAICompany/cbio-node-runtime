[**CBIO Node Runtime Agent API v1.75.4**](../README.md)

***

# Class: PersistentVaultSecretRepository

## Implements

- `SecretRepository`

## Constructors

### Constructor

> **new PersistentVaultSecretRepository**(`db`): `SqliteSecretRepository`

#### Parameters

##### db

`Database`

#### Returns

`SqliteSecretRepository`

## Methods

### delete()

> **delete**(`secret_id`): `Promise`\<`void`\>

#### Parameters

##### secret\_id

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SecretRepository.delete`

***

### getByAlias()

> **getByAlias**(`alias`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Parameters

##### alias

`string`

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Implementation of

`SecretRepository.getByAlias`

***

### getById()

> **getById**(`secret_id`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Parameters

##### secret\_id

`string`

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Implementation of

`SecretRepository.getById`

***

### list()

> **list**(`vault_id`): `Promise`\<readonly [`SecretRecord`](../interfaces/SecretRecord.md)[]\>

#### Parameters

##### vault\_id

`string`

#### Returns

`Promise`\<readonly [`SecretRecord`](../interfaces/SecretRecord.md)[]\>

#### Implementation of

`SecretRepository.list`

***

### save()

> **save**(`record`): `Promise`\<`void`\>

#### Parameters

##### record

[`SecretRecord`](../interfaces/SecretRecord.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SecretRepository.save`
