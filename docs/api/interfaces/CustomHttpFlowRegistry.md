[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: CustomHttpFlowRegistry

## Methods

### get()

> **get**(`vaultId`, `flowId`): `Promise`\<[`CustomHttpFlowDefinition`](CustomHttpFlowDefinition.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](VaultId.md)

##### flowId

`string`

#### Returns

`Promise`\<[`CustomHttpFlowDefinition`](CustomHttpFlowDefinition.md) \| `null`\>

***

### register()

> **register**(`flow`): `Promise`\<`void`\>

#### Parameters

##### flow

[`CustomHttpFlowDefinition`](CustomHttpFlowDefinition.md)

#### Returns

`Promise`\<`void`\>
