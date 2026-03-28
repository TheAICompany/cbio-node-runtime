[**CBIO Node Runtime Agent API v1.63.3**](../README.md)

***

# Interface: DefaultPolicyEngineOptions

## Properties

### grantRevocationRegistry?

> `optional` **grantRevocationRegistry?**: `GrantRevocationRegistry`

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
