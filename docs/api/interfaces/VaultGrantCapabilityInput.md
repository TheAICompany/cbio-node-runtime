[**CBIO Node Runtime Agent API v1.63.3**](../README.md)

***

# Interface: VaultGrantGrantInput

## Properties

### rootAgentId

> **rootAgentId**: `string`

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

> **read**: `GrantReadPolicy`

***

### requestedAt?

> `optional` **requestedAt?**: `string`

***

### skipAudit?

> `optional` **skipAudit?**: `boolean`

***

### write

> **write**: `GrantWritePolicy`
