[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: SignatureAgentProofVerifier

## Implements

- [`AgentProofVerifier`](../interfaces/AgentProofVerifier.md)

## Constructors

### Constructor

> **new SignatureAgentProofVerifier**(`agentIdentities`, `options?`): `SignatureAgentProofVerifier`

#### Parameters

##### agentIdentities

[`AgentIdentityRegistry`](../interfaces/AgentIdentityRegistry.md)

##### options?

[`SignatureAgentProofVerifierOptions`](../interfaces/SignatureAgentProofVerifierOptions.md) = `{}`

#### Returns

`SignatureAgentProofVerifier`

## Methods

### verify()

> **verify**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`DispatchRequest`](../interfaces/DispatchRequest.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`AgentProofVerifier`](../interfaces/AgentProofVerifier.md).[`verify`](../interfaces/AgentProofVerifier.md#verify)
