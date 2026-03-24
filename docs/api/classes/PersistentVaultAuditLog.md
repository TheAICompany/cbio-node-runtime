[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: PersistentVaultAuditLog

## Implements

- [`AuditLog`](../interfaces/AuditLog.md)

## Constructors

### Constructor

> **new PersistentVaultAuditLog**(`_storage`, `_key?`, `_lockKey?`): `FileAuditLog`

#### Parameters

##### \_storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

##### \_key?

`string` = `"vault/sealed/audit.jsonl"`

##### \_lockKey?

`string` = `"vault/sealed/locks/audit"`

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
