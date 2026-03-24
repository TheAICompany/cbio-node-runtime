[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

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

### capability

> **capability**: [`AgentCapability`](AgentCapability.md)

***

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

***

### method

> **method**: `string`

***

### proof

> **proof**: [`AgentProof`](AgentProof.md)

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

### targetUrl

> **targetUrl**: `string`

***

### vaultId

> **vaultId**: [`VaultId`](VaultId.md)
