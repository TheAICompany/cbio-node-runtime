[**CBIO Node Runtime Agent API v1.63.7**](../README.md)

***

# Interface: IStorageProvider

Pluggable storage layer for vault persistence.
Enables Cloud, Mobile, and Edge runtimes to use custom storage.

## Methods

### delete()

> **delete**(`key`): `Promise`\<`void`\>

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### getBaseDir()?

> `optional` **getBaseDir**(): `string`

Optional. Returns the base directory for file-system based storage.

#### Returns

`string`

***

### has()

> **has**(`key`): `Promise`\<`boolean`\>

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`boolean`\>

***

### list()?

> `optional` **list**(`prefix`): `Promise`\<`string`[]\>

Optional. Returns sub-keys (names) under a given prefix.

#### Parameters

##### prefix

`string`

#### Returns

`Promise`\<`string`[]\>

***

### read()

> **read**(`key`): `Promise`\<`Buffer`\<`ArrayBufferLike`\> \| `null`\>

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\> \| `null`\>

***

### rename()?

> `optional` **rename**(`fromKey`, `toKey`): `Promise`\<`void`\>

Optional. If present, used for atomic save. Otherwise vault does write+delete.

#### Parameters

##### fromKey

`string`

##### toKey

`string`

#### Returns

`Promise`\<`void`\>

***

### withLock()?

> `optional` **withLock**\<`T`\>(`key`, `task`): `Promise`\<`T`\>

Optional. If present, used to serialize read-modify-write sequences across writers.

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

##### task

() => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

***

### write()

> **write**(`key`, `data`): `Promise`\<`void`\>

#### Parameters

##### key

`string`

##### data

`Buffer`

#### Returns

`Promise`\<`void`\>
