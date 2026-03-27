[**CBIO Node Runtime Agent API v1.62.0**](../README.md)

***

# Function: restoreIdentity()

> **restoreIdentity**(`privateKey`, `options?`): `CreatedIdentity`

Restores an identity from an existing private key.

## Parameters

### privateKey

`string`

The base64url-encoded PKCS#8 private key.

### options?

[`RestoreIdentityOptions`](../interfaces/RestoreIdentityOptions.md) = `{}`

Optional metadata to attach to the restored object.

## Returns

`CreatedIdentity`

The reconstructed CreatedIdentity.

## Example

```ts
const identity = restoreIdentity('MIIB...');
```
