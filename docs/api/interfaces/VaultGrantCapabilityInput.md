[**CBIO Node Runtime Agent API v1.60.0**](../README.md)

***

# Interface: VaultGrantCapabilityInput

## Properties

### agentId

> **agentId**: `string`

***

### auditRequired?

> `optional` **auditRequired?**: `boolean`

***

### customFlowId?

> `optional` **customFlowId?**: `string`

***

### expiresAt?

> `optional` **expiresAt?**: `string`

***

### expiresIn?

> `optional` **expiresIn?**: `number`

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

### skipAudit?

> `optional` **skipAudit?**: `boolean`

***

### write

> **write**: `CapabilityWritePolicy`
