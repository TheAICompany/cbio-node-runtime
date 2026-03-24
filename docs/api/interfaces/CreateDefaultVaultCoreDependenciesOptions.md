[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Interface: CreateDefaultVaultCoreDependenciesOptions

## Extended by

- [`CreatePersistentVaultCoreDependenciesOptions`](CreatePersistentVaultCoreDependenciesOptions.md)

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

### policy?

> `optional` **policy?**: [`DefaultPolicyEngineOptions`](DefaultPolicyEngineOptions.md)

***

### proofVerifier?

> `optional` **proofVerifier?**: [`SignatureAgentProofVerifierOptions`](SignatureAgentProofVerifierOptions.md)

***

### vaultId?

> `optional` **vaultId?**: `string`
