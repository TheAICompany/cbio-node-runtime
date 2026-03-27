[**CBIO Node Runtime Agent API v1.59.1**](../README.md)

***

# Interface: AgentSubmitCapabilityRequestInput

## Properties

### justification?

> `optional` **justification?**: `string`

***

### operation?

> `optional` **operation?**: `"dispatch_http"` \| `"custom_http"`

***

### read

> **read**: `CapabilityReadPolicy`

***

### requestedAt?

> `optional` **requestedAt?**: `string`

***

### secretAliases?

> `optional` **secretAliases?**: readonly `string`[]

***

### write

> **write**: `Omit`\<`CapabilityWritePolicy`, `"secretIds"`\>
