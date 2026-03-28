[**CBIO Node Runtime Agent API v1.63.7**](../README.md)

***

# Interface: RequestRecord

## Properties

### createdAt

> **createdAt**: `string`

***

### execution

> **execution**: `object`

#### status

> **status**: [`DispatchStatus`](../enumerations/DispatchStatus.md)

***

### missingGrants?

> `optional` **missingGrants?**: `object`

#### agentSecret?

> `optional` **agentSecret?**: `boolean`

#### secretDestination?

> `optional` **secretDestination?**: `boolean`

***

### reason

> **reason**: `string`

***

### request

> **request**: `object`

#### body?

> `optional` **body?**: `string`

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

#### method

> **method**: `string`

#### secretAlias?

> `optional` **secretAlias?**: `string`

#### targetUrl

> **targetUrl**: `string`

***

### requestId

> **requestId**: `string`

***

### response?

> `optional` **response?**: `object`

#### body?

> `optional` **body?**: `string`

#### error?

> `optional` **error?**: `string`

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

#### status?

> `optional` **status?**: `number`

***

### rootAgentId

> **rootAgentId**: `string`

***

### vaultId

> **vaultId**: [`VaultId`](VaultId.md)
