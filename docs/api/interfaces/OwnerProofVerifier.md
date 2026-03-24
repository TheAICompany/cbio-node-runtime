[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: OwnerProofVerifier

## Methods

### verifyAudit()

> **verifyAudit**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerAuditRequest`](OwnerAuditRequest.md)

#### Returns

`Promise`\<`void`\>

***

### verifyDefineSecretTargets()

> **verifyDefineSecretTargets**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerDefineSecretTargetsCommand`](OwnerDefineSecretTargetsCommand.md)

#### Returns

`Promise`\<`void`\>

***

### verifyDeleteSecret()

> **verifyDeleteSecret**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerDeleteSecretCommand`](OwnerDeleteSecretCommand.md)

#### Returns

`Promise`\<`void`\>

***

### verifyExport()

> **verifyExport**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerExportSecretRequest`](OwnerExportSecretRequest.md)

#### Returns

`Promise`\<`void`\>

***

### verifyListAgents()

> **verifyListAgents**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerListAgentsRequest`](OwnerListAgentsRequest.md)

#### Returns

`Promise`\<`void`\>

***

### verifyListCapabilities()

> **verifyListCapabilities**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerListCapabilitiesRequest`](OwnerListCapabilitiesRequest.md)

#### Returns

`Promise`\<`void`\>

***

### verifyRegisterAgentIdentity()

> **verifyRegisterAgentIdentity**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterAgentIdentityCommand`](OwnerRegisterAgentIdentityCommand.md)

#### Returns

`Promise`\<`void`\>

***

### verifyRegisterCapability()

> **verifyRegisterCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterCapabilityCommand`](OwnerRegisterCapabilityCommand.md)

#### Returns

`Promise`\<`void`\>

***

### verifyRegisterCustomFlow()

> **verifyRegisterCustomFlow**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterCustomHttpFlowCommand`](OwnerRegisterCustomHttpFlowCommand.md)

#### Returns

`Promise`\<`void`\>

***

### verifyRevokeCapability()

> **verifyRevokeCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRevokeCapabilityCommand`](OwnerRevokeCapabilityCommand.md)

#### Returns

`Promise`\<`void`\>

***

### verifyWrite()

> **verifyWrite**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerWriteSecretCommand`](OwnerWriteSecretCommand.md)

#### Returns

`Promise`\<`void`\>
