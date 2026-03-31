[**CBIO Node Runtime Agent API v1.75.4**](../README.md)

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

### request\_id

> **request\_id**: `string`

***

### requested\_at

> **requested\_at**: `string`

***

### secret\_id?

> `optional` **secret\_id?**: `string`

***

### skipReplayGuard?

> `optional` **skipReplayGuard?**: `boolean`

***

### target\_url

> **target\_url**: `string`

***

### vault\_id

> **vault\_id**: `string`
