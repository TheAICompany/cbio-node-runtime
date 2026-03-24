[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Interface: VaultCore

## Properties

### vaultId

> `readonly` **vaultId**: [`VaultId`](VaultId.md)

## Methods

### authorizeDispatch()

> **authorizeDispatch**(`request`): `Promise`\<[`DispatchAuthorization`](DispatchAuthorization.md)\>

#### Parameters

##### request

[`DispatchRequest`](DispatchRequest.md)

#### Returns

`Promise`\<[`DispatchAuthorization`](DispatchAuthorization.md)\>

***

### bootstrapOwnerIdentity()

> **bootstrapOwnerIdentity**(`identity`): `Promise`\<`void`\>

#### Parameters

##### identity

[`OwnerIdentityRecord`](OwnerIdentityRecord.md)

#### Returns

`Promise`\<`void`\>

***

### defineSecretTargets()

> **defineSecretTargets**(`command`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

#### Parameters

##### command

[`OwnerDefineSecretTargetsCommand`](OwnerDefineSecretTargetsCommand.md)

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>

***

### deleteSecret()

> **deleteSecret**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerDeleteSecretCommand`](OwnerDeleteSecretCommand.md)

#### Returns

`Promise`\<`void`\>

***

### dispatchSecret()

> **dispatchSecret**(`request`): `Promise`\<[`DispatchResult`](DispatchResult.md)\>

#### Parameters

##### request

[`DispatchRequest`](DispatchRequest.md)

#### Returns

`Promise`\<[`DispatchResult`](DispatchResult.md)\>

***

### exportSecret()

> **exportSecret**(`actor`, `alias`, `request?`): `Promise`\<[`OwnerSecretExport`](OwnerSecretExport.md)\>

#### Parameters

##### actor

[`VaultPrincipal`](VaultPrincipal.md) & `object`

##### alias

`string`

##### request?

`Omit`\<[`OwnerExportSecretRequest`](OwnerExportSecretRequest.md), `"actor"` \| `"vaultId"` \| `"alias"`\>

#### Returns

`Promise`\<[`OwnerSecretExport`](OwnerSecretExport.md)\>

***

### getAudit()

> **getAudit**(`actor`, `query`, `request?`): `Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>

#### Parameters

##### actor

[`VaultPrincipal`](VaultPrincipal.md) & `object`

##### query

[`AuditQuery`](AuditQuery.md)

##### request?

`Omit`\<[`OwnerAuditRequest`](OwnerAuditRequest.md), `"actor"` \| `"query"` \| `"vaultId"`\>

#### Returns

`Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>

***

### getCapability()

> **getCapability**(`vaultId`, `agentId`, `capabilityId`): `Promise`\<[`AgentCapability`](AgentCapability.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](VaultId.md)

##### agentId

`string`

##### capabilityId

`string`

#### Returns

`Promise`\<[`AgentCapability`](AgentCapability.md) \| `null`\>

***

### listAgents()

> **listAgents**(`actor`, `request?`): `Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

#### Parameters

##### actor

[`VaultPrincipal`](VaultPrincipal.md) & `object`

##### request?

`Omit`\<[`OwnerListAgentsRequest`](OwnerListAgentsRequest.md), `"actor"` \| `"vaultId"`\>

#### Returns

`Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

***

### listCapabilities()

> **listCapabilities**(`actor`, `agentId?`, `request?`): `Promise`\<readonly [`AgentCapability`](AgentCapability.md)[]\>

#### Parameters

##### actor

[`VaultPrincipal`](VaultPrincipal.md) & `object`

##### agentId?

`string`

##### request?

`Omit`\<[`OwnerListCapabilitiesRequest`](OwnerListCapabilitiesRequest.md), `"actor"` \| `"vaultId"` \| `"agentId"`\>

#### Returns

`Promise`\<readonly [`AgentCapability`](AgentCapability.md)[]\>

***

### registerAgentIdentity()

> **registerAgentIdentity**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterAgentIdentityCommand`](OwnerRegisterAgentIdentityCommand.md)

#### Returns

`Promise`\<`void`\>

***

### registerCapability()

> **registerCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterCapabilityCommand`](OwnerRegisterCapabilityCommand.md)

#### Returns

`Promise`\<`void`\>

***

### registerCustomFlow()

> **registerCustomFlow**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterCustomHttpFlowCommand`](OwnerRegisterCustomHttpFlowCommand.md)

#### Returns

`Promise`\<`void`\>

***

### revokeCapability()

> **revokeCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRevokeCapabilityCommand`](OwnerRevokeCapabilityCommand.md)

#### Returns

`Promise`\<`void`\>

***

### storeCustomFlowSecret()

> **storeCustomFlowSecret**(`flow`, `alias`, `plaintext`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

#### Parameters

##### flow

[`CustomHttpFlowDefinition`](CustomHttpFlowDefinition.md)

##### alias

`string`

##### plaintext

`string`

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>

***

### writeSecret()

> **writeSecret**(`command`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

#### Parameters

##### command

[`VaultWriteSecretCommand`](../type-aliases/VaultWriteSecretCommand.md)

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>
