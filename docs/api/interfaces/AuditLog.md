[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Interface: AuditLog

## Methods

### append()

> **append**(`entry`): `Promise`\<`void`\>

#### Parameters

##### entry

[`AuditEntry`](AuditEntry.md)

#### Returns

`Promise`\<`void`\>

***

### query()

> **query**(`query`): `Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>

#### Parameters

##### query

[`AuditQuery`](AuditQuery.md)

#### Returns

`Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>
