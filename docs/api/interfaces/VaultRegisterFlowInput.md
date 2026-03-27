[**CBIO Node Runtime Agent API v1.59.1**](../README.md)

***

# Interface: VaultRegisterFlowInput

## Extends

- `OwnerHttpFlowBoundary`

## Properties

### method

> **method**: `string`

#### Inherited from

`OwnerHttpFlowBoundary.method`

***

### mode

> **mode**: `"acquire_secret"` \| `"send_secret"` \| `"bidirectional_secret"`

#### Inherited from

`OwnerHttpFlowBoundary.mode`

***

### requestedAt?

> `optional` **requestedAt?**: `string`

***

### responseSecret?

> `optional` **responseSecret?**: `object`

#### field

> **field**: `string`

#### kind

> **kind**: `"json_field"`

#### storeAlias

> **storeAlias**: `string`

#### Inherited from

`OwnerHttpFlowBoundary.responseSecret`

***

### responseVisibility

> **responseVisibility**: `"passthrough"` \| `"shape_only"`

#### Inherited from

`OwnerHttpFlowBoundary.responseVisibility`

***

### targetUrl

> **targetUrl**: `string`

#### Inherited from

`OwnerHttpFlowBoundary.targetUrl`
