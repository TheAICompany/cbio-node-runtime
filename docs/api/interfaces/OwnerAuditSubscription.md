[**CBIO Node Runtime Agent API v1.71.0**](../README.md)

***

# Interface: OwnerAuditSubscription

## Properties

### afterEventId?

> `optional` **afterEventId?**: `string`

***

### operations?

> `optional` **operations?**: readonly [`AuditOperation`](../enumerations/AuditOperation.md)[]

***

### request\_id?

> `optional` **request\_id?**: `string`

***

### root\_agent\_id?

> `optional` **root\_agent\_id?**: `string`

## Methods

### onEvent()

> **onEvent**(`entry`): `void`

#### Parameters

##### entry

[`AuditEntry`](AuditEntry.md)

#### Returns

`void`
