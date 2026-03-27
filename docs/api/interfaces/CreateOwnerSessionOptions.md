[**CBIO Node Runtime Agent API v1.57.0**](../README.md)

***

# Interface: CreateOwnerSessionOptions

## Extends

- [`RecoverVaultOptions`](RecoverVaultOptions.md)

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

#### Overrides

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

### ownerIdentity?

> `optional` **ownerIdentity?**: `CreatedIdentity` \| [`VaultIdentity`](VaultIdentity.md)

***

### password

> **password**: `string`

#### Inherited from

[`RecoverVaultOptions`](RecoverVaultOptions.md).[`password`](RecoverVaultOptions.md#password)

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

### sensitiveActionVerifier?

> `optional` **sensitiveActionVerifier?**: (`confirmation`, `context`) => `boolean` \| `Promise`\<`boolean`\>

#### Parameters

##### confirmation

[`OwnerSensitiveActionConfirmation`](OwnerSensitiveActionConfirmation.md)

##### context

[`OwnerSensitiveActionContext`](OwnerSensitiveActionContext.md)

#### Returns

`boolean` \| `Promise`\<`boolean`\>

***

### sessionTokens?

> `optional` **sessionTokens?**: `ISessionTokenRegistry`

#### Inherited from

[`VaultCoreDependenciesOptions`](VaultCoreDependenciesOptions.md).[`sessionTokens`](VaultCoreDependenciesOptions.md#sessiontokens)

***

### signer?

> `optional` **signer?**: [`VaultSigner`](VaultSigner.md)

***

### skipWarmup?

> `optional` **skipWarmup?**: `boolean`

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

#### Inherited from

[`RecoverVaultOptions`](RecoverVaultOptions.md).[`vault`](RecoverVaultOptions.md#vault)

***

### vaultId

> **vaultId**: `string`

#### Inherited from

[`RecoverVaultOptions`](RecoverVaultOptions.md).[`vaultId`](RecoverVaultOptions.md#vaultid)
