[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: FsStorageProvider

Pluggable storage layer for vault persistence.
Enables Cloud, Mobile, and Edge runtimes to use custom storage.

## Implements

- [`IStorageProvider`](../interfaces/IStorageProvider.md)

## Constructors

### Constructor

> **new FsStorageProvider**(`baseDir?`): `FsStorageProvider`

#### Parameters

##### baseDir?

`string`

#### Returns

`FsStorageProvider`

## Methods

### delete()

> **delete**(`key`): `Promise`\<`void`\>

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IStorageProvider`](../interfaces/IStorageProvider.md).[`delete`](../interfaces/IStorageProvider.md#delete)

***

### has()

> **has**(`key`): `Promise`\<`boolean`\>

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`IStorageProvider`](../interfaces/IStorageProvider.md).[`has`](../interfaces/IStorageProvider.md#has)

***

### list()

> **list**(`prefix`): `Promise`\<`string`[]\>

Optional. Returns sub-keys (names) under a given prefix.

#### Parameters

##### prefix

`string`

#### Returns

`Promise`\<`string`[]\>

#### Implementation of

[`IStorageProvider`](../interfaces/IStorageProvider.md).[`list`](../interfaces/IStorageProvider.md#list)

***

### read()

> **read**(`key`): `Promise`\<`Buffer`\<`ArrayBufferLike`\> \| `null`\>

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\> \| `null`\>

#### Implementation of

[`IStorageProvider`](../interfaces/IStorageProvider.md).[`read`](../interfaces/IStorageProvider.md#read)

***

### rename()

> **rename**(`fromKey`, `toKey`): `Promise`\<`void`\>

Optional. If present, used for atomic save. Otherwise vault does write+delete.

#### Parameters

##### fromKey

`string`

##### toKey

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IStorageProvider`](../interfaces/IStorageProvider.md).[`rename`](../interfaces/IStorageProvider.md#rename)

***

### withLock()

> **withLock**\<`T`\>(`key`, `task`): `Promise`\<`T`\>

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

#### Implementation of

[`IStorageProvider`](../interfaces/IStorageProvider.md).[`withLock`](../interfaces/IStorageProvider.md#withlock)

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

#### Implementation of

[`IStorageProvider`](../interfaces/IStorageProvider.md).[`write`](../interfaces/IStorageProvider.md#write)
