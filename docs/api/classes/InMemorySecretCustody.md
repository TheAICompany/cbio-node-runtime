[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: InMemorySecretCustody

## Implements

- [`SecretCustody`](../interfaces/SecretCustody.md)

## Constructors

### Constructor

> **new InMemorySecretCustody**(): `InMemorySecretCustody`

#### Returns

`InMemorySecretCustody`

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
