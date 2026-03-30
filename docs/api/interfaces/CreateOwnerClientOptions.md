[**CBIO Node Runtime Agent API v1.70.1**](../README.md)

***

# Interface: CreateOwnerClientOptions

## Properties

### clock?

> `optional` **clock?**: `Clock`

***

### password\_verifier?

> `optional` **password\_verifier?**: (`password`) => `boolean` \| `Promise`\<`boolean`\>

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

### skipWarmup?

> `optional` **skipWarmup?**: `boolean`

***

### vault

> **vault**: [`VaultService`](VaultService.md)
