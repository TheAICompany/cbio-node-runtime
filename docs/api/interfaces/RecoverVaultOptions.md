[**CBIO Node Runtime Agent API v1.65.0**](../README.md)

***

# Interface: RecoverVaultOptions

## Extends

- `Omit`\<[`CreatePersistentVaultCoreDependenciesOptions`](CreatePersistentVaultCoreDependenciesOptions.md), `"vaultWorkingKey"` \| `"vault_id"`\>

## Extended by

- [`CreateOwnerSessionOptions`](CreateOwnerSessionOptions.md)

## Properties

### password

> **password**: `string`

***

### vault?

> `optional` **vault?**: `object`

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

***

### vault\_id

> **vault\_id**: `string`
