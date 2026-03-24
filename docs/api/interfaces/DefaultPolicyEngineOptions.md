[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Interface: DefaultPolicyEngineOptions

## Properties

### capabilityRevocationRegistry?

> `optional` **capabilityRevocationRegistry?**: [`CapabilityRevocationRegistry`](CapabilityRevocationRegistry.md)

***

### now?

> `optional` **now?**: () => `Date`

#### Returns

`Date`

***

### rateLimitStore?

> `optional` **rateLimitStore?**: [`RateLimitStore`](RateLimitStore.md)

***

### trustedIssuerIdResolver?

> `optional` **trustedIssuerIdResolver?**: (`issuerId`) => `boolean` \| `Promise`\<`boolean`\>

#### Parameters

##### issuerId

`string`

#### Returns

`boolean` \| `Promise`\<`boolean`\>

***

### trustedIssuerIds?

> `optional` **trustedIssuerIds?**: readonly `string`[]
