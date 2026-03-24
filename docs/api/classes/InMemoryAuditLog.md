[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: InMemoryAuditLog

## Implements

- [`AuditLog`](../interfaces/AuditLog.md)

## Constructors

### Constructor

> **new InMemoryAuditLog**(): `InMemoryAuditLog`

#### Returns

`InMemoryAuditLog`

## Methods

### append()

> **append**(`entry`): `Promise`\<`void`\>

#### Parameters

##### entry

[`AuditEntry`](../interfaces/AuditEntry.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`AuditLog`](../interfaces/AuditLog.md).[`append`](../interfaces/AuditLog.md#append)

***

### query()

> **query**(`query`): `Promise`\<readonly [`AuditEntry`](../interfaces/AuditEntry.md)[]\>

#### Parameters

##### query

[`AuditQuery`](../interfaces/AuditQuery.md)

#### Returns

`Promise`\<readonly [`AuditEntry`](../interfaces/AuditEntry.md)[]\>

#### Implementation of

[`AuditLog`](../interfaces/AuditLog.md).[`query`](../interfaces/AuditLog.md#query)
