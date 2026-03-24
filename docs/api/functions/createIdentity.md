[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Function: createIdentity()

> **createIdentity**(`options?`): `CreatedIdentity`

Creates a new root identity with a fresh Ed25519 keypair.

## Parameters

### options?

[`CreateIdentityOptions`](../interfaces/CreateIdentityOptions.md)

Configuration for the new identity.

## Returns

`CreatedIdentity`

A CreatedIdentity containing the ID and keys.

## Example

```ts
const identity = createIdentity({ nickname: 'my-agent' });
console.log(identity.identityId);
```
