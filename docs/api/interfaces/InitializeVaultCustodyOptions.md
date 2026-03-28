[**CBIO Node Runtime Agent API v1.67.0**](../README.md)

***

# Interface: InitializeVaultCustodyOptions

## Properties

### password?

> `optional` **password?**: `string`

***

### storage

> **storage**: `object`

#### read()

> **read**(`key`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

##### Parameters

###### key

`string`

##### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

#### write()

> **write**(`key`, `data`): `Promise`\<`void`\>

##### Parameters

###### key

`string`

###### data

`Uint8Array`

##### Returns

`Promise`\<`void`\>
