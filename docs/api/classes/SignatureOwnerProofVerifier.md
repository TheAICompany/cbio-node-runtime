[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: SignatureOwnerProofVerifier

## Implements

- [`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md)

## Constructors

### Constructor

> **new SignatureOwnerProofVerifier**(`ownerIdentities`, `options?`): `SignatureOwnerProofVerifier`

#### Parameters

##### ownerIdentities

[`OwnerIdentityRegistry`](../interfaces/OwnerIdentityRegistry.md)

##### options?

[`SignatureAgentProofVerifierOptions`](../interfaces/SignatureAgentProofVerifierOptions.md) = `{}`

#### Returns

`SignatureOwnerProofVerifier`

## Methods

### verifyAudit()

> **verifyAudit**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerAuditRequest`](../interfaces/OwnerAuditRequest.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md).[`verifyAudit`](../interfaces/OwnerProofVerifier.md#verifyaudit)

***

### verifyDefineSecretTargets()

> **verifyDefineSecretTargets**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerDefineSecretTargetsCommand`](../interfaces/OwnerDefineSecretTargetsCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md).[`verifyDefineSecretTargets`](../interfaces/OwnerProofVerifier.md#verifydefinesecrettargets)

***

### verifyDeleteSecret()

> **verifyDeleteSecret**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerDeleteSecretCommand`](../interfaces/OwnerDeleteSecretCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md).[`verifyDeleteSecret`](../interfaces/OwnerProofVerifier.md#verifydeletesecret)

***

### verifyExport()

> **verifyExport**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerExportSecretRequest`](../interfaces/OwnerExportSecretRequest.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md).[`verifyExport`](../interfaces/OwnerProofVerifier.md#verifyexport)

***

### verifyListAgents()

> **verifyListAgents**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerListAgentsRequest`](../interfaces/OwnerListAgentsRequest.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md).[`verifyListAgents`](../interfaces/OwnerProofVerifier.md#verifylistagents)

***

### verifyListCapabilities()

> **verifyListCapabilities**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerListCapabilitiesRequest`](../interfaces/OwnerListCapabilitiesRequest.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md).[`verifyListCapabilities`](../interfaces/OwnerProofVerifier.md#verifylistcapabilities)

***

### verifyRegisterAgentIdentity()

> **verifyRegisterAgentIdentity**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterAgentIdentityCommand`](../interfaces/OwnerRegisterAgentIdentityCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md).[`verifyRegisterAgentIdentity`](../interfaces/OwnerProofVerifier.md#verifyregisteragentidentity)

***

### verifyRegisterCapability()

> **verifyRegisterCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterCapabilityCommand`](../interfaces/OwnerRegisterCapabilityCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md).[`verifyRegisterCapability`](../interfaces/OwnerProofVerifier.md#verifyregistercapability)

***

### verifyRegisterCustomFlow()

> **verifyRegisterCustomFlow**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterCustomHttpFlowCommand`](../interfaces/OwnerRegisterCustomHttpFlowCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md).[`verifyRegisterCustomFlow`](../interfaces/OwnerProofVerifier.md#verifyregistercustomflow)

***

### verifyRevokeCapability()

> **verifyRevokeCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRevokeCapabilityCommand`](../interfaces/OwnerRevokeCapabilityCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md).[`verifyRevokeCapability`](../interfaces/OwnerProofVerifier.md#verifyrevokecapability)

***

### verifyWrite()

> **verifyWrite**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerWriteSecretCommand`](../interfaces/OwnerWriteSecretCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`OwnerProofVerifier`](../interfaces/OwnerProofVerifier.md).[`verifyWrite`](../interfaces/OwnerProofVerifier.md#verifywrite)
