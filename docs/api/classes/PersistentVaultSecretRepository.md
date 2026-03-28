[**CBIO Node Runtime Agent API v1.63.5**](../README.md)

***

# Class: PersistentVaultSecretRepository

## Implements

- `SecretRepository`

## Constructors

### Constructor

> **new PersistentVaultSecretRepository**(`baseDir`): `FileSecretRepository`

#### Parameters

##### baseDir

`string`

#### Returns

`FileSecretRepository`

## Methods

### delete()

> **delete**(`secretId`): `Promise`\<`void`\>

#### Parameters

##### secretId

[`SecretId`](../interfaces/SecretId.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SecretRepository.delete`

***

### getByAlias()

> **getByAlias**(`alias`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Parameters

##### alias

###### value

`string`

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Implementation of

`SecretRepository.getByAlias`

***

### getById()

> **getById**(`secretId`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Parameters

##### secretId

[`SecretId`](../interfaces/SecretId.md)

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Implementation of

`SecretRepository.getById`

***

### list()

> **list**(`vaultId`): `Promise`\<readonly [`SecretRecord`](../interfaces/SecretRecord.md)[]\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

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
