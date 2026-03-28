[**CBIO Node Runtime Agent API v1.63.7**](../README.md)

***

# Interface: DispatchRequest

## Properties

### agent

> **agent**: [`VaultPrincipal`](VaultPrincipal.md) & `object`

#### Type Declaration

##### kind

> **kind**: `"agent"`

***

### body?

> `optional` **body?**: `string`

***

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

***

### method

> **method**: `string`

***

### proof

> **proof**: `AgentProof`

***

### reason

> **reason**: `string`

***

### requestedAt

> **requestedAt**: `string`

***

### requestId

> **requestId**: `string`

***

### secretAlias?

> `optional` **secretAlias?**: `string`

***

### skipReplayGuard?

> `optional` **skipReplayGuard?**: `boolean`

***

### targetUrl

> **targetUrl**: `string`

***

### vaultId

> **vaultId**: [`VaultId`](VaultId.md)
