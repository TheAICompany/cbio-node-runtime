[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: ChildIdentity

## Properties

### childIndex

> **childIndex**: `number`

The derivation index, if this is a child identity.

#### Overrides

`CreatedIdentity.childIndex`

***

### identityId

> **identityId**: `string`

The unique identifier for this identity (derived from public key).

#### Inherited from

`CreatedIdentity.identityId`

***

### nickname?

> `optional` **nickname?**: `string`

A human-readable label (local only, not part of the crypto identity).

#### Inherited from

`CreatedIdentity.nickname`

***

### parentIdentityId

> **parentIdentityId**: `string`

The identity ID of the parent, if this is a child identity.

#### Overrides

`CreatedIdentity.parentIdentityId`

***

### privateKey

> **privateKey**: `string`

The base64url-encoded Ed25519 PKCS#8 private key.

#### Inherited from

`CreatedIdentity.privateKey`

***

### publicKey

> **publicKey**: `string`

The base64url-encoded public key.

#### Inherited from

`CreatedIdentity.publicKey`
