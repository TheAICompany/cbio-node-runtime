[**CBIO Node Runtime Agent API v1.64.0**](../README.md)

***

# Interface: CreateOwnerSessionOptions

## Extends

- [`RecoverVaultOptions`](RecoverVaultOptions.md)

## Properties

### clock?

> `optional` **clock?**: `Clock`

***

### password

> **password**: `string`

#### Inherited from

[`RecoverVaultOptions`](RecoverVaultOptions.md).[`password`](RecoverVaultOptions.md#password)

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

### signer?

> `optional` **signer?**: `any`

***

### skipWarmup?

> `optional` **skipWarmup?**: `boolean`

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

#### Inherited from

[`RecoverVaultOptions`](RecoverVaultOptions.md).[`vault`](RecoverVaultOptions.md#vault)

***

### vault\_id

> **vault\_id**: `string`

#### Inherited from

[`RecoverVaultOptions`](RecoverVaultOptions.md).[`vault_id`](RecoverVaultOptions.md#vault_id)
