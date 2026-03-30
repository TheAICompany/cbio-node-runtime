[**CBIO Node Runtime Agent API v1.73.0**](../README.md)

***

# Function: restoreIdentity()

> **restoreIdentity**(`private_key`, `options?`): `CreatedIdentity`

Restores an identity from an existing private key.

## Parameters

### private\_key

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
