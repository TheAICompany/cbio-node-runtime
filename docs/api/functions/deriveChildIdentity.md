[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Function: deriveChildIdentity()

> **deriveChildIdentity**(`parent`, `childIndex`, `options?`): [`ChildIdentity`](../interfaces/ChildIdentity.md)

Deterministically derives a child identity from a parent's private key and an index.

## Parameters

### parent

`string` \| `CreatedIdentity`

The parent identity object or its private key string.

### childIndex

`number`

A non-negative integer for derivation.

### options?

[`DeriveIdentityOptions`](../interfaces/DeriveIdentityOptions.md) = `{}`

Optional nickname for the child.

## Returns

[`ChildIdentity`](../interfaces/ChildIdentity.md)

A [ChildIdentity](../interfaces/ChildIdentity.md) with derivation metadata.

## Example

```ts
const child = deriveChildIdentity(parentIdentity, 0, { nickname: 'sub-agent-0' });
```
