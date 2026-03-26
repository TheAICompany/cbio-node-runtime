[**CBIO Node Runtime Agent API v1.55.1**](../README.md)

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

### requester

> **requester**: `VaultPrincipal`

***

### scope

> **scope**: `string`

***

### secretAliases?

> `optional` **secretAliases?**: readonly `string`[]

***

### skipAudit?

> `optional` **skipAudit?**: `boolean`
