[**CBIO Node Runtime Agent API v1.67.2**](../README.md)

***

# Interface: OwnerRequestRecord

## Properties

### created\_at

> **created\_at**: `string`

***

### execution\_status

> **execution\_status**: [`DispatchStatus`](../enumerations/DispatchStatus.md)

***

### missing\_grants?

> `optional` **missing\_grants?**: `object`

#### agent\_secret?

> `optional` **agent\_secret?**: `boolean`

#### secret\_destination?

> `optional` **secret\_destination?**: `boolean`

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

#### target\_url

> **target\_url**: `string`

***

### request\_id

> **request\_id**: `string`

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
