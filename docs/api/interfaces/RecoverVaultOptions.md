[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: RecoverVaultOptions

## Extends

- `Omit`\<[`CreatePersistentVaultCoreDependenciesOptions`](CreatePersistentVaultCoreDependenciesOptions.md), `"vaultWorkingKey"` \| `"vaultId"`\>

## Properties

### authHeaderName?

> `optional` **authHeaderName?**: `string`

#### Inherited from

[`CreateDefaultVaultCoreDependenciesOptions`](CreateDefaultVaultCoreDependenciesOptions.md).[`authHeaderName`](CreateDefaultVaultCoreDependenciesOptions.md#authheadername)

***

### authPrefix?

> `optional` **authPrefix?**: `string`

#### Inherited from

[`CreateDefaultVaultCoreDependenciesOptions`](CreateDefaultVaultCoreDependenciesOptions.md).[`authPrefix`](CreateDefaultVaultCoreDependenciesOptions.md#authprefix)

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

[`CreateDefaultVaultCoreDependenciesOptions`](CreateDefaultVaultCoreDependenciesOptions.md).[`fetchImpl`](CreateDefaultVaultCoreDependenciesOptions.md#fetchimpl)

***

### ownerIdentity

> **ownerIdentity**: `CreatedIdentity`

***

### policy?

> `optional` **policy?**: [`DefaultPolicyEngineOptions`](DefaultPolicyEngineOptions.md)

#### Inherited from

[`CreateDefaultVaultCoreDependenciesOptions`](CreateDefaultVaultCoreDependenciesOptions.md).[`policy`](CreateDefaultVaultCoreDependenciesOptions.md#policy)

***

### proofVerifier?

> `optional` **proofVerifier?**: [`SignatureAgentProofVerifierOptions`](SignatureAgentProofVerifierOptions.md)

#### Inherited from

[`CreateDefaultVaultCoreDependenciesOptions`](CreateDefaultVaultCoreDependenciesOptions.md).[`proofVerifier`](CreateDefaultVaultCoreDependenciesOptions.md#proofverifier)

***

### vault?

> `optional` **vault?**: `object`

#### customFlows?

> `optional` **customFlows?**: [`VaultCustomFlowResolver`](VaultCustomFlowResolver.md)

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
