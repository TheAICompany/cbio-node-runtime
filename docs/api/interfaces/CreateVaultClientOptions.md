[**CBIO Node Runtime Agent API v1.56.0**](../README.md)

***

# Interface: CreateVaultClientOptions

## Properties

### clock?

> `optional` **clock?**: `Clock`

***

### ownerIdentity?

> `optional` **ownerIdentity?**: `CreatedIdentity` \| [`VaultIdentity`](VaultIdentity.md)

***

### passwordVerifier?

> `optional` **passwordVerifier?**: (`password`) => `boolean` \| `Promise`\<`boolean`\>

#### Parameters

##### password

`string`

#### Returns

`boolean` \| `Promise`\<`boolean`\>

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

> `optional` **signer?**: [`VaultSigner`](VaultSigner.md)

***

### skipWarmup?

> `optional` **skipWarmup?**: `boolean`

***

### vault

> **vault**: `VaultService`
