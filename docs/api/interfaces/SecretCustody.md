[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: SecretCustody

## Methods

### delete()

> **delete**(`secretId`): `Promise`\<`void`\>

#### Parameters

##### secretId

[`SecretId`](SecretId.md)

#### Returns

`Promise`\<`void`\>

***

### load()

> **load**(`secretId`): `Promise`\<`string` \| `null`\>

#### Parameters

##### secretId

[`SecretId`](SecretId.md)

#### Returns

`Promise`\<`string` \| `null`\>

***

### store()

> **store**(`secretId`, `plaintext`): `Promise`\<`void`\>

#### Parameters

##### secretId

[`SecretId`](SecretId.md)

##### plaintext

`string`

#### Returns

`Promise`\<`void`\>
