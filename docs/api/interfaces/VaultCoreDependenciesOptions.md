[**CBIO Node Runtime Agent API v1.76.1**](../README.md)

***

# Interface: VaultCoreDependenciesOptions

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

### sessionTokenRegistry?

> `optional` **sessionTokenRegistry?**: `ISessionTokenRegistry`

***

### vault\_id?

> `optional` **vault\_id?**: `string`
