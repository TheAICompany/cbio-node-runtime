[**CBIO Node Runtime Agent API v1.63.3**](../README.md)

***

# Interface: VaultSubmitGrantRequestInput

## Properties

### rootAgentId

> **rootAgentId**: `string`

***

### expiresAt?

> `optional` **expiresAt?**: `string`

***

### operation?

> `optional` **operation?**: `string`

***

### rateLimit?

> `optional` **rateLimit?**: `object`

#### maxRequests

> **maxRequests**: `number`

#### windowMs

> **windowMs**: `number`

***

### read

> **read**: `GrantReadPolicy`

***

### reason?

> `optional` **reason?**: `string`

***

### requestedAt?

> `optional` **requestedAt?**: `string`

***

### requester

> **requester**: `VaultPrincipal`

***

### skipAudit?

> `optional` **skipAudit?**: `boolean`

***

### write

> **write**: `GrantWritePolicy`
