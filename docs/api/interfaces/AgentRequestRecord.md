[**CBIO Node Runtime Agent API v1.72.0**](../README.md)

***

# Interface: AgentRequestRecord

## Properties

### created\_at

> **created\_at**: `string`

***

### execution\_status

> **execution\_status**: [`DispatchStatus`](../enumerations/DispatchStatus.md)

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

#### secret\_id?

> `optional` **secret\_id?**: [`SecretId`](SecretId.md)

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

### secret\_id?

> `optional` **secret\_id?**: [`SecretId`](SecretId.md)
