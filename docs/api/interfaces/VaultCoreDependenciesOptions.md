[**CBIO Node Runtime Agent API v1.61.0**](../README.md)

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

### clock?

> `optional` **clock?**: `Clock`

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

### replayGuard?

> `optional` **replayGuard?**: `ReplayGuard`

***

### sessionTokens?

> `optional` **sessionTokens?**: `ISessionTokenRegistry`

***

### vaultId?

> `optional` **vaultId?**: `string`
