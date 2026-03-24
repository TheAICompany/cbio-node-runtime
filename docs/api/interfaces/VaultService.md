[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Interface: VaultService

## Properties

### vaultId

> `readonly` **vaultId**: [`VaultId`](VaultId.md)

## Methods

### acquireSecret()

> **acquireSecret**(`request`): `Promise`\<[`VaultAcquireSecretResult`](VaultAcquireSecretResult.md)\>

#### Parameters

##### request

[`VaultAcquireSecretInput`](VaultAcquireSecretInput.md)

#### Returns

`Promise`\<[`VaultAcquireSecretResult`](VaultAcquireSecretResult.md)\>

***

### bootstrapOwnerIdentity()

> **bootstrapOwnerIdentity**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerIdentityRecord`](OwnerIdentityRecord.md)

#### Returns

`Promise`\<`void`\>

***

### defineSecretTargets()

> **defineSecretTargets**(`request`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

#### Parameters

##### request

[`OwnerDefineSecretTargetsCommand`](OwnerDefineSecretTargetsCommand.md)

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>

***

### deleteSecret()

> **deleteSecret**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerDeleteSecretCommand`](OwnerDeleteSecretCommand.md)

#### Returns

`Promise`\<`void`\>

***

### dispatch()

> **dispatch**(`request`): `Promise`\<[`DispatchResult`](DispatchResult.md)\>

#### Parameters

##### request

[`DispatchRequest`](DispatchRequest.md)

#### Returns

`Promise`\<[`DispatchResult`](DispatchResult.md)\>

***

### exportSecret()

> **exportSecret**(`request`): `Promise`\<[`OwnerSecretExport`](OwnerSecretExport.md)\>

#### Parameters

##### request

[`OwnerExportSecretRequest`](OwnerExportSecretRequest.md)

#### Returns

`Promise`\<[`OwnerSecretExport`](OwnerSecretExport.md)\>

***

### handleAgentDispatch()

> **handleAgentDispatch**(`request`): `Promise`\<[`VaultAgentDispatchResponse`](VaultAgentDispatchResponse.md) \| [`VaultAgentDispatchErrorResponse`](VaultAgentDispatchErrorResponse.md)\>

#### Parameters

##### request

[`VaultAgentDispatchRequest`](VaultAgentDispatchRequest.md)

#### Returns

`Promise`\<[`VaultAgentDispatchResponse`](VaultAgentDispatchResponse.md) \| [`VaultAgentDispatchErrorResponse`](VaultAgentDispatchErrorResponse.md)\>

***

### listAgents()

> **listAgents**(`request`): `Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

#### Parameters

##### request

[`OwnerListAgentsRequest`](OwnerListAgentsRequest.md)

#### Returns

`Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

***

### listCapabilities()

> **listCapabilities**(`request`): `Promise`\<readonly [`AgentCapability`](AgentCapability.md)[]\>

#### Parameters

##### request

[`OwnerListCapabilitiesRequest`](OwnerListCapabilitiesRequest.md)

#### Returns

`Promise`\<readonly [`AgentCapability`](AgentCapability.md)[]\>

***

### readAudit()

> **readAudit**(`request`): `Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>

#### Parameters

##### request

[`OwnerAuditRequest`](OwnerAuditRequest.md)

#### Returns

`Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>

***

### registerAgentIdentity()

> **registerAgentIdentity**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerRegisterAgentIdentityCommand`](OwnerRegisterAgentIdentityCommand.md)

#### Returns

`Promise`\<`void`\>

***

### registerCapability()

> **registerCapability**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerRegisterCapabilityCommand`](OwnerRegisterCapabilityCommand.md)

#### Returns

`Promise`\<`void`\>

***

### registerCustomFlow()

> **registerCustomFlow**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerRegisterCustomHttpFlowCommand`](OwnerRegisterCustomHttpFlowCommand.md)

#### Returns

`Promise`\<`void`\>

***

### revokeCapability()

> **revokeCapability**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`OwnerRevokeCapabilityCommand`](OwnerRevokeCapabilityCommand.md)

#### Returns

`Promise`\<`void`\>

***

### writeSecret()

> **writeSecret**(`request`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

#### Parameters

##### request

[`VaultWriteSecretCommand`](../type-aliases/VaultWriteSecretCommand.md)

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>
