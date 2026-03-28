[**CBIO Node Runtime Agent API v1.67.0**](../README.md)

***

# Class: PersistentVaultAuditLog

## Implements

- `AuditLog`

## Constructors

### Constructor

> **new PersistentVaultAuditLog**(`baseDir`): `FileAuditLog`

#### Parameters

##### baseDir

`string`

#### Returns

`FileAuditLog`

## Methods

### append()

> **append**(`entry`): `Promise`\<`void`\>

#### Parameters

##### entry

[`AuditEntry`](../interfaces/AuditEntry.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`AuditLog.append`

***

### query()

> **query**(`query`): `Promise`\<readonly [`AuditEntry`](../interfaces/AuditEntry.md)[]\>

#### Parameters

##### query

`AuditQuery`

#### Returns

`Promise`\<readonly [`AuditEntry`](../interfaces/AuditEntry.md)[]\>

#### Implementation of

`AuditLog.query`
