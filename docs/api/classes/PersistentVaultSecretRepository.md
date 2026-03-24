[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: PersistentVaultSecretRepository

## Implements

- [`SecretRepository`](../interfaces/SecretRepository.md)

## Constructors

### Constructor

> **new PersistentVaultSecretRepository**(`storage`, `vaultWorkingKey`, `key?`, `_lockKey?`): `FileSecretRepository`

#### Parameters

##### storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

##### vaultWorkingKey

`string`

##### key?

`string` = `"vault/sealed/secrets.sealed"`

##### \_lockKey?

`string` = `"vault/sealed/locks/secrets"`

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

[`SecretRepository`](../interfaces/SecretRepository.md).[`delete`](../interfaces/SecretRepository.md#delete)

***

### getByAlias()

> **getByAlias**(`alias`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Parameters

##### alias

[`SecretAlias`](../interfaces/SecretAlias.md)

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Implementation of

[`SecretRepository`](../interfaces/SecretRepository.md).[`getByAlias`](../interfaces/SecretRepository.md#getbyalias)

***

### getById()

> **getById**(`secretId`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Parameters

##### secretId

[`SecretId`](../interfaces/SecretId.md)

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`\>

#### Implementation of

[`SecretRepository`](../interfaces/SecretRepository.md).[`getById`](../interfaces/SecretRepository.md#getbyid)

***

### save()

> **save**(`record`): `Promise`\<`void`\>

#### Parameters

##### record

[`SecretRecord`](../interfaces/SecretRecord.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`SecretRepository`](../interfaces/SecretRepository.md).[`save`](../interfaces/SecretRepository.md#save)
