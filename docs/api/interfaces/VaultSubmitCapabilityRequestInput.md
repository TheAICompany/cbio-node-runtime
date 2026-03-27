[**CBIO Node Runtime Agent API v1.61.0**](../README.md)

***

# Interface: VaultSubmitCapabilityRequestInput

## Properties

### agentId

> **agentId**: `string`

***

### expiresAt?

> `optional` **expiresAt?**: `string`

***

### justification?

> `optional` **justification?**: `string`

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

> **read**: `CapabilityReadPolicy`

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

> **write**: `CapabilityWritePolicy`
