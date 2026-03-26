[**CBIO Node Runtime Agent API v1.47.2**](../README.md)

***

# Interface: VaultCoreDependenciesOptions

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

> `optional` **proofVerifier?**: `SignatureAgentProofVerifierOptions`

***

### vaultId?

> `optional` **vaultId?**: `string`
