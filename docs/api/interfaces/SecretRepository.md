[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: SecretRepository

## Methods

### delete()

> **delete**(`secretId`): `Promise`\<`void`\>

#### Parameters

##### secretId

[`SecretId`](SecretId.md)

#### Returns

`Promise`\<`void`\>

***

### getByAlias()

> **getByAlias**(`alias`): `Promise`\<[`SecretRecord`](SecretRecord.md) \| `null`\>

#### Parameters

##### alias

[`SecretAlias`](SecretAlias.md)

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md) \| `null`\>

***

### getById()

> **getById**(`secretId`): `Promise`\<[`SecretRecord`](SecretRecord.md) \| `null`\>

#### Parameters

##### secretId

[`SecretId`](SecretId.md)

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md) \| `null`\>

***

### save()

> **save**(`record`): `Promise`\<`void`\>

#### Parameters

##### record

[`SecretRecord`](SecretRecord.md)

#### Returns

`Promise`\<`void`\>
