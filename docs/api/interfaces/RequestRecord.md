[**CBIO Node Runtime Agent API v1.72.0**](../README.md)

***

# Interface: RequestRecord

## Properties

### created\_at

> **created\_at**: `string`

***

### execution

> **execution**: `object`

#### status

> **status**: [`DispatchStatus`](../enumerations/DispatchStatus.md)

***

### missing\_grants?

> `optional` **missing\_grants?**: `object`

#### agent\_secret?

> `optional` **agent\_secret?**: `boolean`

#### secret\_destination?

> `optional` **secret\_destination?**: `boolean`

***

### pending\_dispatch\_event?

> `optional` **pending\_dispatch\_event?**: `object`

#### emitted\_at

> **emitted\_at**: `string`

#### event\_id

> **event\_id**: `string`

***

### reason

> **reason**: `string`

***

### request

> **request**: `object`

#### body?

> `optional` **body?**: `string`

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

#### method

> **method**: `string`

#### secret\_alias?

> `optional` **secret\_alias?**: `string`

#### secret\_id

> **secret\_id**: [`SecretId`](SecretId.md) \| `null`

#### target\_url

> **target\_url**: `string`

***

### request\_id

> **request\_id**: `string`

***

### requested\_at

> **requested\_at**: `string`

***

### response?

> `optional` **response?**: `object`

#### body?

> `optional` **body?**: `string`

#### error?

> `optional` **error?**: `string`

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

#### status?

> `optional` **status?**: `number`

***

### root\_agent\_id

> **root\_agent\_id**: `string`

***

### vault\_id

> **vault\_id**: [`VaultId`](VaultId.md)
