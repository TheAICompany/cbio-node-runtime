[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: CustomHttpFlowDefinition

## Properties

### createdAt

> **createdAt**: `string`

***

### flowId

> **flowId**: `string`

***

### method

> **method**: `string`

***

### mode

> **mode**: `"acquire_secret"` \| `"send_secret"` \| `"bidirectional_secret"`

***

### ownerId

> **ownerId**: `string`

***

### responseSecret?

> `optional` **responseSecret?**: `object`

#### field

> **field**: `string`

#### kind

> **kind**: `"json_field"`

#### storeAlias

> **storeAlias**: `string`

***

### responseVisibility

> **responseVisibility**: `"passthrough"` \| `"shape_only"`

***

### targetUrl

> **targetUrl**: `string`

***

### vaultId

> **vaultId**: [`VaultId`](VaultId.md)
