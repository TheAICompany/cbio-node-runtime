[**CBIO Node Runtime Agent API v1.68.0**](../README.md)

***

# Interface: DefaultPolicyEngineOptions

## Properties

### now?

> `optional` **now?**: () => `Date`

#### Returns

`Date`

***

### trusted\_issuer\_ids?

> `optional` **trusted\_issuer\_ids?**: readonly `string`[]

***

### trustedIssuerIdResolver?

> `optional` **trustedIssuerIdResolver?**: (`issuer_id`) => `boolean` \| `Promise`\<`boolean`\>

#### Parameters

##### issuer\_id

`string`

#### Returns

`boolean` \| `Promise`\<`boolean`\>
