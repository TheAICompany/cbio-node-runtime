[**CBIO Node Runtime Agent API v1.65.0**](../README.md)

***

# Interface: AuditEntry

## Properties

### actor

> **actor**: [`VaultPrincipal`](VaultPrincipal.md)

***

### decision

> **decision**: `"allowed"` \| `"denied"`

***

### detail

> **detail**: `string`

***

### error\_code?

> `optional` **error\_code?**: `string` \| `null`

***

### event\_id

> **event\_id**: `string`

***

### execution\_status

> **execution\_status**: `"not_executed"` \| `"succeeded"` \| `"failed"`

***

### operation

> **operation**: [`AuditOperation`](../enumerations/AuditOperation.md)

***

### request\_id?

> `optional` **request\_id?**: `string`

***

### root\_agent\_id?

> `optional` **root\_agent\_id?**: `string`

***

### secret\_alias?

> `optional` **secret\_alias?**: `string`

***

### secret\_id?

> `optional` **secret\_id?**: `string`

***

### site\_id?

> `optional` **site\_id?**: `string`

***

### target?

> `optional` **target?**: `object`

#### kind

> **kind**: `"http"` \| `"other"`

#### url

> **url**: `string`

***

### ts

> **ts**: `string`

***

### vault\_id

> **vault\_id**: `string`
