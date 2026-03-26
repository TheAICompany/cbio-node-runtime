[**CBIO Node Runtime Agent API v1.48.5**](../README.md)

***

# Interface: VaultGrantCapabilityInput

## Properties

### agentId

> **agentId**: `string`

***

### allowedMethods?

> `optional` **allowedMethods?**: readonly `string`[]

***

### allowedPaths?

> `optional` **allowedPaths?**: readonly `string`[]

***

### allowedTargets?

> `optional` **allowedTargets?**: readonly `string`[]

***

### capabilityId?

> `optional` **capabilityId?**: `string`

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

### requestedAt?

> `optional` **requestedAt?**: `string`

***

### secretAliases?

> `optional` **secretAliases?**: readonly `string`[]

***

### skipAudit?

> `optional` **skipAudit?**: `boolean`
