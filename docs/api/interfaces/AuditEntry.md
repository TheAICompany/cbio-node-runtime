[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Interface: AuditEntry

## Properties

### action

> **action**: [`AuditAction`](../enumerations/AuditAction.md)

***

### actor

> **actor**: [`VaultPrincipal`](VaultPrincipal.md)

***

### agentId?

> `optional` **agentId?**: `string`

***

### capabilityId?

> `optional` **capabilityId?**: `string`

***

### detail

> **detail**: `string`

***

### entryId

> **entryId**: `string`

***

### occurredAt

> **occurredAt**: `string`

***

### operation?

> `optional` **operation?**: `"dispatch_http"` \| `"custom_http"` \| [`AuditAction`](../enumerations/AuditAction.md)

***

### outcome

> **outcome**: [`AuditOutcome`](../enumerations/AuditOutcome.md)

***

### requestId?

> `optional` **requestId?**: `string`

***

### secretAlias?

> `optional` **secretAlias?**: `string`

***

### secretId?

> `optional` **secretId?**: `string`

***

### targetUrl?

> `optional` **targetUrl?**: `string`

***

### vaultId

> **vaultId**: `string`
