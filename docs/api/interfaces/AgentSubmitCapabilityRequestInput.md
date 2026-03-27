[**CBIO Node Runtime Agent API v1.62.1**](../README.md)

***

# Interface: AgentSubmitCapabilityRequestInput

## Properties

### operation?

> `optional` **operation?**: `"dispatch_http"` \| `"custom_http"`

***

### read

> **read**: `CapabilityReadPolicy`

***

### reason

> **reason**: `string`

***

### requestedAt?

> `optional` **requestedAt?**: `string`

***

### secretAliases?

> `optional` **secretAliases?**: readonly `string`[]

***

### write

> **write**: `Omit`\<`CapabilityWritePolicy`, `"secretIds"`\>
