[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Interface: AgentCapability

## Properties

### agentId

> **agentId**: `string`

***

### allowedMethods

> **allowedMethods**: readonly `string`[]

***

### allowedPaths?

> `optional` **allowedPaths?**: readonly `string`[]

***

### allowedTargets

> **allowedTargets**: readonly `string`[]

***

### auditRequired?

> `optional` **auditRequired?**: `boolean`

***

### capabilityId

> **capabilityId**: `string`

***

### customFlowId?

> `optional` **customFlowId?**: `string`

***

### expiresAt?

> `optional` **expiresAt?**: `string`

***

### issuedAt

> **issuedAt**: `string`

***

### operation

> **operation**: `"dispatch_http"` \| `"custom_http"`

***

### rateLimit?

> `optional` **rateLimit?**: `object`

#### maxRequests

> **maxRequests**: `number`

#### windowMs

> **windowMs**: `number`

***

### revocationVersion?

> `optional` **revocationVersion?**: `number`

***

### secretAliases?

> `optional` **secretAliases?**: readonly `string`[]

***

### secretIds?

> `optional` **secretIds?**: readonly `string`[]

***

### vaultId

> **vaultId**: [`VaultId`](VaultId.md)
