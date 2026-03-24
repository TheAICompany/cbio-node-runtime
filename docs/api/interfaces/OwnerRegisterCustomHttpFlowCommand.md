[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: OwnerRegisterCustomHttpFlowCommand

## Properties

### flow

> **flow**: `object`

#### flowId

> **flowId**: `string`

#### method

> **method**: `string`

#### mode

> **mode**: `"acquire_secret"` \| `"send_secret"` \| `"bidirectional_secret"`

#### responseSecret?

> `optional` **responseSecret?**: `object`

##### responseSecret.field

> **field**: `string`

##### responseSecret.kind

> **kind**: `"json_field"`

##### responseSecret.storeAlias

> **storeAlias**: `string`

#### responseVisibility

> **responseVisibility**: `"passthrough"` \| `"shape_only"`

#### targetUrl

> **targetUrl**: `string`

***

### owner

> **owner**: [`VaultPrincipal`](VaultPrincipal.md) & `object`

#### Type Declaration

##### kind

> **kind**: `"owner"`

***

### proof

> **proof**: [`OwnerProof`](OwnerProof.md)

***

### requestedAt

> **requestedAt**: `string`

***

### requestId

> **requestId**: `string`

***

### vaultId

> **vaultId**: [`VaultId`](VaultId.md)
