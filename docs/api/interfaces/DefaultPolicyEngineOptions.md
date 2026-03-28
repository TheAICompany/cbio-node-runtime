[**CBIO Node Runtime Agent API v1.63.7**](../README.md)

***

# Interface: DefaultPolicyEngineOptions

## Properties

### now?

> `optional` **now?**: () => `Date`

#### Returns

`Date`

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
