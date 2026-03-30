[**CBIO Node Runtime Agent API v1.72.0**](../README.md)

***

# Class: PersistentVaultAuditLog

## Implements

- `AuditLog`

## Constructors

### Constructor

> **new PersistentVaultAuditLog**(`db`): `SqliteAuditLog`

#### Parameters

##### db

`Database`

#### Returns

`SqliteAuditLog`

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

***

### subscribe()

> **subscribe**(`vault_id`, `subscription`): () => `void`

#### Parameters

##### vault\_id

[`VaultId`](../interfaces/VaultId.md)

##### subscription

[`OwnerAuditSubscription`](../interfaces/OwnerAuditSubscription.md)

#### Returns

() => `void`

#### Implementation of

`AuditLog.subscribe`
