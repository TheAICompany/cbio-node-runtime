[**CBIO Node Runtime Agent API v1.52.1**](../README.md)

***

# Interface: RecoverVaultOptions

## Extends

- `Omit`\<[`CreatePersistentVaultCoreDependenciesOptions`](CreatePersistentVaultCoreDependenciesOptions.md), `"vaultWorkingKey"` \| `"vaultId"`\>

## Properties

### authHeaderName?

> `optional` **authHeaderName?**: `string`

#### Inherited from

[`VaultCoreDependenciesOptions`](VaultCoreDependenciesOptions.md).[`authHeaderName`](VaultCoreDependenciesOptions.md#authheadername)

***

### authPrefix?

> `optional` **authPrefix?**: `string`

#### Inherited from

[`VaultCoreDependenciesOptions`](VaultCoreDependenciesOptions.md).[`authPrefix`](VaultCoreDependenciesOptions.md#authprefix)

***

### clock?

> `optional` **clock?**: `Clock`

#### Inherited from

[`VaultCoreDependenciesOptions`](VaultCoreDependenciesOptions.md).[`clock`](VaultCoreDependenciesOptions.md#clock)

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

#### Inherited from

[`VaultCoreDependenciesOptions`](VaultCoreDependenciesOptions.md).[`fetchImpl`](VaultCoreDependenciesOptions.md#fetchimpl)

***

### password

> **password**: `string`

***

### policy?

> `optional` **policy?**: [`DefaultPolicyEngineOptions`](DefaultPolicyEngineOptions.md)

#### Inherited from

[`VaultCoreDependenciesOptions`](VaultCoreDependenciesOptions.md).[`policy`](VaultCoreDependenciesOptions.md#policy)

***

### proofVerifier?

> `optional` **proofVerifier?**: `SignatureAgentProofVerifierOptions`

#### Inherited from

[`VaultCoreDependenciesOptions`](VaultCoreDependenciesOptions.md).[`proofVerifier`](VaultCoreDependenciesOptions.md#proofverifier)

***

### replayGuard?

> `optional` **replayGuard?**: `ReplayGuard`

#### Inherited from

[`VaultCoreDependenciesOptions`](VaultCoreDependenciesOptions.md).[`replayGuard`](VaultCoreDependenciesOptions.md#replayguard)

***

### sessionTokens?

> `optional` **sessionTokens?**: `ISessionTokenRegistry`

#### Inherited from

[`VaultCoreDependenciesOptions`](VaultCoreDependenciesOptions.md).[`sessionTokens`](VaultCoreDependenciesOptions.md#sessiontokens)

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

***

### vaultId

> **vaultId**: `string`
