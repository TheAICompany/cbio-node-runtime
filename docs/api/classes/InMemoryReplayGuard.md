[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Class: InMemoryReplayGuard

## Implements

- [`ReplayGuard`](../interfaces/ReplayGuard.md)

## Constructors

### Constructor

> **new InMemoryReplayGuard**(`options?`): `InMemoryReplayGuard`

#### Parameters

##### options?

[`SignatureAgentProofVerifierOptions`](../interfaces/SignatureAgentProofVerifierOptions.md) = `{}`

#### Returns

`InMemoryReplayGuard`

## Methods

### assertNotReplayed()

> **assertNotReplayed**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`DispatchRequest`](../interfaces/DispatchRequest.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ReplayGuard`](../interfaces/ReplayGuard.md).[`assertNotReplayed`](../interfaces/ReplayGuard.md#assertnotreplayed)
