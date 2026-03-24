[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Interface: VaultRegisterFlowInput

## Extends

- [`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md)

## Properties

### flowId

> **flowId**: `string`

***

### method

> **method**: `string`

#### Inherited from

[`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md).[`method`](OwnerHttpFlowBoundary.md#method)

***

### mode

> **mode**: `"acquire_secret"` \| `"send_secret"` \| `"bidirectional_secret"`

#### Inherited from

[`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md).[`mode`](OwnerHttpFlowBoundary.md#mode)

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

[`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md).[`responseSecret`](OwnerHttpFlowBoundary.md#responsesecret)

***

### responseVisibility

> **responseVisibility**: `"passthrough"` \| `"shape_only"`

#### Inherited from

[`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md).[`responseVisibility`](OwnerHttpFlowBoundary.md#responsevisibility)

***

### targetUrl

> **targetUrl**: `string`

#### Inherited from

[`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md).[`targetUrl`](OwnerHttpFlowBoundary.md#targeturl)
