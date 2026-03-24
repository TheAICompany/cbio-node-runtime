[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: OwnerHttpFlowBoundary

## Extended by

- [`VaultRegisterFlowInput`](VaultRegisterFlowInput.md)

## Properties

### method

> **method**: `string`

***

### mode

> **mode**: `"acquire_secret"` \| `"send_secret"` \| `"bidirectional_secret"`

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
