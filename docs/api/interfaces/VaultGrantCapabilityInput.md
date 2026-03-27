[**CBIO Node Runtime Agent API v1.57.0**](../README.md)

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

### methods

> **methods**: readonly `string`[]

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

### requestedAt?

> `optional` **requestedAt?**: `string`

***

### scope

> **scope**: `string`

***

### secretAliases?

> `optional` **secretAliases?**: readonly `string`[]

***

### secretIds?

> `optional` **secretIds?**: readonly `string`[]

***

### skipAudit?

> `optional` **skipAudit?**: `boolean`
