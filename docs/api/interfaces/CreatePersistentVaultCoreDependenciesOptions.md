[**CBIO Node Runtime Agent API v1.72.0**](../README.md)

***

# Interface: CreatePersistentVaultCoreDependenciesOptions

## Properties

### authHeaderName?

> `optional` **authHeaderName?**: `string`

***

### authPrefix?

> `optional` **authPrefix?**: `string`

***

### fetchImpl?

> `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`URL` \| `RequestInfo`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`string` \| `URL` \| `Request`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

***

### proofVerifier?

> `optional` **proofVerifier?**: `SignatureAgentProofVerifierOptions`

***

### replayGuard?

> `optional` **replayGuard?**: `ReplayGuard`

***

### vault\_id

> **vault\_id**: `string`

***

### vaultWorkingKey

> **vaultWorkingKey**: `string`
