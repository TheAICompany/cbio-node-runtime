[**CBIO Node Runtime Agent API v1.63.5**](../README.md)

***

# Interface: CreateVaultOptions

## Extends

- `Omit`\<[`CreatePersistentVaultCoreDependenciesOptions`](CreatePersistentVaultCoreDependenciesOptions.md), `"vaultWorkingKey"` \| `"vaultId"`\>

## Properties

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `any`\>

***

### nickname?

> `optional` **nickname?**: `string`

***

### password

> **password**: `string`

***

### vault?

> `optional` **vault?**: `object`

#### customFlows?

> `optional` **customFlows?**: `VaultCustomFlowResolver`

#### fetchImpl?

> `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

##### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

###### Parameters

###### input

`URL` \| `RequestInfo`

###### init?

`RequestInit`

###### Returns

`Promise`\<`Response`\>

##### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

###### Parameters

###### input

`string` \| `URL` \| `Request`

###### init?

`RequestInit`

###### Returns

`Promise`\<`Response`\>
