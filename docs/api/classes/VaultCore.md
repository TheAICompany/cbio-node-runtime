[**CBIO Node Runtime Agent API v1.48.4**](../README.md)

***

# Class: VaultCore

The Sovereign Vault Core.
This is the primary implementation of the Vault logic.

## Constructors

### Constructor

> **new VaultCore**(`_deps`): `VaultCore`

#### Parameters

##### \_deps

`VaultCoreDependencies`

#### Returns

`VaultCore`

## Accessors

### vaultId

#### Get Signature

> **get** **vaultId**(): `VaultId`

##### Returns

`VaultId`

## Methods

### approveDispatch()

> **approveDispatch**(`command`): `Promise`\<`DispatchResult`\>

#### Parameters

##### command

`OwnerApproveDispatchCommand`

#### Returns

`Promise`\<`DispatchResult`\>

***

### authorizeDispatch()

> **authorizeDispatch**(`request`): `Promise`\<`DispatchAuthorization`\>

#### Parameters

##### request

`DispatchRequest`

#### Returns

`Promise`\<`DispatchAuthorization`\>

***

### defineSecretTargets()

> **defineSecretTargets**(`command`): `Promise`\<`SecretRecord`\>

#### Parameters

##### command

`OwnerDefineSecretTargetsCommand`

#### Returns

`Promise`\<`SecretRecord`\>

***

### deleteSecret()

> **deleteSecret**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerDeleteSecretCommand`

#### Returns

`Promise`\<`void`\>

***

### dispatchSecret()

> **dispatchSecret**(`request`): `Promise`\<`DispatchResult`\>

#### Parameters

##### request

`DispatchRequest`

#### Returns

`Promise`\<`DispatchResult`\>

***

### exportSecret()

> **exportSecret**(`actor`, `alias`, `request?`): `Promise`\<`OwnerSecretExport`\>

#### Parameters

##### actor

`VaultPrincipal` & `object`

##### alias

`string`

##### request?

`Omit`\<`OwnerExportSecretRequest`, `"vaultId"` \| `"actor"` \| `"alias"`\>

#### Returns

`Promise`\<`OwnerSecretExport`\>

***

### getAudit()

> **getAudit**(`actor`, `query`, `request?`): `Promise`\<readonly `AuditEntry`[]\>

#### Parameters

##### actor

`VaultPrincipal` & `object`

##### query

`AuditQuery`

##### request?

`Omit`\<`OwnerAuditRequest`, `"vaultId"` \| `"actor"` \| `"query"`\>

#### Returns

`Promise`\<readonly `AuditEntry`[]\>

***

### getCapability()

> **getCapability**(`vaultId`, `agentId`, `capabilityId`): `Promise`\<`AgentCapability` \| `null`\>

#### Parameters

##### vaultId

`VaultId`

##### agentId

`string`

##### capabilityId

`string`

#### Returns

`Promise`\<`AgentCapability` \| `null`\>

***

### issueAgentSessionToken()

> **issueAgentSessionToken**(`request`): `Promise`\<`OwnerSessionToken`\>

#### Parameters

##### request

`OwnerIssueSessionTokenRequest`

#### Returns

`Promise`\<`OwnerSessionToken`\>

***

### listAgents()

> **listAgents**(`actor`, `request?`): `Promise`\<readonly `AgentIdentityRecord`[]\>

#### Parameters

##### actor

`VaultPrincipal` & `object`

##### request?

`Omit`\<`OwnerListAgentsRequest`, `"vaultId"` \| `"actor"`\>

#### Returns

`Promise`\<readonly `AgentIdentityRecord`[]\>

***

### listCapabilities()

> **listCapabilities**(`actor`, `agentId?`, `request?`): `Promise`\<readonly `AgentCapability`[]\>

#### Parameters

##### actor

`VaultPrincipal` & `object`

##### agentId?

`string`

##### request?

`Omit`\<`OwnerListCapabilitiesRequest`, `"vaultId"` \| `"actor"` \| `"agentId"`\>

#### Returns

`Promise`\<readonly `AgentCapability`[]\>

***

### listPendingDispatches()

> **listPendingDispatches**(`command`): `Promise`\<readonly `PendingDispatchRecord`[]\>

#### Parameters

##### command

###### owner

`VaultPrincipal`

###### vaultId

`VaultId`

#### Returns

`Promise`\<readonly `PendingDispatchRecord`[]\>

***

### onPendingRequest()

> **onPendingRequest**(`callback`): () => `void`

#### Parameters

##### callback

(`record`) => `void`

#### Returns

() => `void`

***

### registerAgentIdentity()

> **registerAgentIdentity**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRegisterAgentIdentityCommand`

#### Returns

`Promise`\<`void`\>

***

### registerCapability()

> **registerCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRegisterCapabilityCommand`

#### Returns

`Promise`\<`void`\>

***

### registerCustomFlow()

> **registerCustomFlow**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRegisterCustomHttpFlowCommand`

#### Returns

`Promise`\<`void`\>

***

### rejectDispatch()

> **rejectDispatch**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRejectDispatchCommand`

#### Returns

`Promise`\<`void`\>

***

### revokeAgentSessionToken()

> **revokeAgentSessionToken**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

###### actor

`VaultPrincipal` & `object`

###### token

`string`

###### vaultId

`VaultId`

#### Returns

`Promise`\<`void`\>

***

### revokeCapability()

> **revokeCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRevokeCapabilityCommand`

#### Returns

`Promise`\<`void`\>

***

### storeCustomFlowSecret()

> **storeCustomFlowSecret**(`flow`, `alias`, `plaintext`): `Promise`\<`SecretRecord`\>

#### Parameters

##### flow

`CustomHttpFlowDefinition`

##### alias

`string`

##### plaintext

`string`

#### Returns

`Promise`\<`SecretRecord`\>

***

### writeSecret()

> **writeSecret**(`command`): `Promise`\<`SecretRecord`\>

#### Parameters

##### command

`VaultWriteSecretCommand`

#### Returns

`Promise`\<`SecretRecord`\>
