[**CBIO Node Runtime Agent API v1.72.0**](../README.md)

***

# Interface: OwnerVisibleRequestRecord

## Properties

### created\_at

> **created\_at**: `string`

***

### error?

> `optional` **error?**: `string`

***

### execution\_status

> **execution\_status**: [`DispatchStatus`](../enumerations/DispatchStatus.md)

***

### has\_response\_body

> **has\_response\_body**: `boolean`

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

### request\_id

> **request\_id**: `string`

***

### response\_status?

> `optional` **response\_status?**: `number`

***

### root\_agent\_id

> **root\_agent\_id**: `string`

***

### secret\_id?

> `optional` **secret\_id?**: [`SecretId`](SecretId.md)

***

### target\_url

> **target\_url**: `string`
