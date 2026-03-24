[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: DefaultVaultCore

## Implements

- [`VaultCore`](../interfaces/VaultCore.md)

## Constructors

### Constructor

> **new DefaultVaultCore**(`_deps`): `DefaultVaultCore`

#### Parameters

##### \_deps

[`VaultCoreDependencies`](../interfaces/VaultCoreDependencies.md)

#### Returns

`DefaultVaultCore`

## Accessors

### vaultId

#### Get Signature

> **get** **vaultId**(): [`VaultId`](../interfaces/VaultId.md)

##### Returns

[`VaultId`](../interfaces/VaultId.md)

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`vaultId`](../interfaces/VaultCore.md#vaultid)

## Methods

### authorizeDispatch()

> **authorizeDispatch**(`request`): `Promise`\<[`DispatchAuthorization`](../interfaces/DispatchAuthorization.md)\>

#### Parameters

##### request

[`DispatchRequest`](../interfaces/DispatchRequest.md)

#### Returns

`Promise`\<[`DispatchAuthorization`](../interfaces/DispatchAuthorization.md)\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`authorizeDispatch`](../interfaces/VaultCore.md#authorizedispatch)

***

### bootstrapOwnerIdentity()

> **bootstrapOwnerIdentity**(`identity`): `Promise`\<`void`\>

#### Parameters

##### identity

[`OwnerIdentityRecord`](../interfaces/OwnerIdentityRecord.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`bootstrapOwnerIdentity`](../interfaces/VaultCore.md#bootstrapowneridentity)

***

### defineSecretTargets()

> **defineSecretTargets**(`command`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>

#### Parameters

##### command

[`OwnerDefineSecretTargetsCommand`](../interfaces/OwnerDefineSecretTargetsCommand.md)

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`defineSecretTargets`](../interfaces/VaultCore.md#definesecrettargets)

***

### deleteSecret()

> **deleteSecret**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerDeleteSecretCommand`](../interfaces/OwnerDeleteSecretCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`deleteSecret`](../interfaces/VaultCore.md#deletesecret)

***

### dispatchSecret()

> **dispatchSecret**(`request`): `Promise`\<[`DispatchResult`](../interfaces/DispatchResult.md)\>

#### Parameters

##### request

[`DispatchRequest`](../interfaces/DispatchRequest.md)

#### Returns

`Promise`\<[`DispatchResult`](../interfaces/DispatchResult.md)\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`dispatchSecret`](../interfaces/VaultCore.md#dispatchsecret)

***

### exportSecret()

> **exportSecret**(`actor`, `alias`, `request?`): `Promise`\<[`OwnerSecretExport`](../interfaces/OwnerSecretExport.md)\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### alias

`string`

##### request?

`Omit`\<[`OwnerExportSecretRequest`](../interfaces/OwnerExportSecretRequest.md), `"actor"` \| `"vaultId"` \| `"alias"`\>

#### Returns

`Promise`\<[`OwnerSecretExport`](../interfaces/OwnerSecretExport.md)\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`exportSecret`](../interfaces/VaultCore.md#exportsecret)

***

### getAudit()

> **getAudit**(`actor`, `query`, `request?`): `Promise`\<readonly [`AuditEntry`](../interfaces/AuditEntry.md)[]\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### query

[`AuditQuery`](../interfaces/AuditQuery.md)

##### request?

`Omit`\<[`OwnerAuditRequest`](../interfaces/OwnerAuditRequest.md), `"actor"` \| `"query"` \| `"vaultId"`\>

#### Returns

`Promise`\<readonly [`AuditEntry`](../interfaces/AuditEntry.md)[]\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`getAudit`](../interfaces/VaultCore.md#getaudit)

***

### getCapability()

> **getCapability**(`vaultId`, `agentId`, `capabilityId`): `Promise`\<[`AgentCapability`](../interfaces/AgentCapability.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### agentId

`string`

##### capabilityId

`string`

#### Returns

`Promise`\<[`AgentCapability`](../interfaces/AgentCapability.md) \| `null`\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`getCapability`](../interfaces/VaultCore.md#getcapability)

***

### listAgents()

> **listAgents**(`actor`, `request?`): `Promise`\<readonly [`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)[]\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### request?

`Omit`\<[`OwnerListAgentsRequest`](../interfaces/OwnerListAgentsRequest.md), `"actor"` \| `"vaultId"`\>

#### Returns

`Promise`\<readonly [`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)[]\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`listAgents`](../interfaces/VaultCore.md#listagents)

***

### listCapabilities()

> **listCapabilities**(`actor`, `agentId?`, `request?`): `Promise`\<readonly [`AgentCapability`](../interfaces/AgentCapability.md)[]\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### agentId?

`string`

##### request?

`Omit`\<[`OwnerListCapabilitiesRequest`](../interfaces/OwnerListCapabilitiesRequest.md), `"actor"` \| `"vaultId"` \| `"agentId"`\>

#### Returns

`Promise`\<readonly [`AgentCapability`](../interfaces/AgentCapability.md)[]\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`listCapabilities`](../interfaces/VaultCore.md#listcapabilities)

***

### registerAgentIdentity()

> **registerAgentIdentity**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterAgentIdentityCommand`](../interfaces/OwnerRegisterAgentIdentityCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`registerAgentIdentity`](../interfaces/VaultCore.md#registeragentidentity)

***

### registerCapability()

> **registerCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterCapabilityCommand`](../interfaces/OwnerRegisterCapabilityCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`registerCapability`](../interfaces/VaultCore.md#registercapability)

***

### registerCustomFlow()

> **registerCustomFlow**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRegisterCustomHttpFlowCommand`](../interfaces/OwnerRegisterCustomHttpFlowCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`registerCustomFlow`](../interfaces/VaultCore.md#registercustomflow)

***

### revokeCapability()

> **revokeCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerRevokeCapabilityCommand`](../interfaces/OwnerRevokeCapabilityCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`revokeCapability`](../interfaces/VaultCore.md#revokecapability)

***

### storeCustomFlowSecret()

> **storeCustomFlowSecret**(`flow`, `alias`, `plaintext`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>

#### Parameters

##### flow

[`CustomHttpFlowDefinition`](../interfaces/CustomHttpFlowDefinition.md)

##### alias

`string`

##### plaintext

`string`

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`storeCustomFlowSecret`](../interfaces/VaultCore.md#storecustomflowsecret)

***

### writeSecret()

> **writeSecret**(`command`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>

#### Parameters

##### command

[`VaultWriteSecretCommand`](../type-aliases/VaultWriteSecretCommand.md)

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>

#### Implementation of

[`VaultCore`](../interfaces/VaultCore.md).[`writeSecret`](../interfaces/VaultCore.md#writesecret)
