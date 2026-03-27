[**CBIO Node Runtime Agent API v1.62.1**](../README.md)

***

# Interface: DefaultPolicyEngineOptions

## Properties

### capabilityRevocationRegistry?

> `optional` **capabilityRevocationRegistry?**: `CapabilityRevocationRegistry`

***

### now?

> `optional` **now?**: () => `Date`

#### Returns

`Date`

***

### rateLimitStore?

> `optional` **rateLimitStore?**: `RateLimitStore`

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
