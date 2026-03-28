[**CBIO Node Runtime Agent API v1.63.3**](../README.md)

***

# Interface: AgentSubmitGrantRequestInput

## Properties

### operation?

> `optional` **operation?**: `"dispatch_http"` \| `"custom_http"`

***

### read

> **read**: `GrantReadPolicy`

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

> **write**: `Omit`\<`GrantWritePolicy`, `"secretIds"`\>
