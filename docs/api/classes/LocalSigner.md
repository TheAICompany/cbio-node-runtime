[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: LocalSigner

## Implements

- [`Signer`](../interfaces/Signer.md)

## Constructors

### Constructor

> **new LocalSigner**(`keyPair`): `LocalSigner`

#### Parameters

##### keyPair

`KeyPair`

#### Returns

`LocalSigner`

## Methods

### getPublicKey()

> **getPublicKey**(): `Promise`\<`string`\>

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`Signer`](../interfaces/Signer.md).[`getPublicKey`](../interfaces/Signer.md#getpublickey)

***

### sign()

> **sign**(`nonce`): `Promise`\<`string`\>

#### Parameters

##### nonce

`string`

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`Signer`](../interfaces/Signer.md).[`sign`](../interfaces/Signer.md#sign)
