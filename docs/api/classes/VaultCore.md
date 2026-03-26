[**CBIO Node Runtime Agent API v1.51.0**](../README.md)

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

### \_getCapability()

> **\_getCapability**(`vaultId`, `agentId`, `capabilityId`): `Promise`\<`AgentCapability` \| `null`\>

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

### \_storeCustomFlowSecret()

> **\_storeCustomFlowSecret**(`flow`, `alias`, `plaintext`): `Promise`\<`SecretRecord`\>

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

### agentAuthorizeDispatch()

> **agentAuthorizeDispatch**(`request`): `Promise`\<`DispatchAuthorization`\>

#### Parameters

##### request

`DispatchRequest`

#### Returns

`Promise`\<`DispatchAuthorization`\>

***

### agentDispatchSecret()

> **agentDispatchSecret**(`request`): `Promise`\<`DispatchResult`\>

#### Parameters

##### request

`DispatchRequest`

#### Returns

`Promise`\<`DispatchResult`\>

***

### agentListCapabilities()

> **agentListCapabilities**(`request`): `Promise`\<readonly `AgentCapability`[]\>

#### Parameters

##### request

`AgentListCapabilitiesRequest`

#### Returns

`Promise`\<readonly `AgentCapability`[]\>

***

### agentListSecrets()

> **agentListSecrets**(`request`): `Promise`\<readonly `AgentVisibleSecretRecord`[]\>

#### Parameters

##### request

`AgentListSecretsRequest`

#### Returns

`Promise`\<readonly `AgentVisibleSecretRecord`[]\>

***

### agentSubmitCapabilityRequest()

> **agentSubmitCapabilityRequest**(`command`): `Promise`\<`PendingCapabilityRequestRecord`\>

#### Parameters

##### command

`AgentSubmitCapabilityRequestCommand`

#### Returns

`Promise`\<`PendingCapabilityRequestRecord`\>

***

### ownerApproveCapabilityRequest()

> **ownerApproveCapabilityRequest**(`command`): `Promise`\<`AgentCapability`\>

#### Parameters

##### command

`OwnerApproveCapabilityRequestCommand`

#### Returns

`Promise`\<`AgentCapability`\>

***

### ownerApproveDispatch()

> **ownerApproveDispatch**(`command`): `Promise`\<`DispatchResult`\>

#### Parameters

##### command

`OwnerApproveDispatchCommand`

#### Returns

`Promise`\<`DispatchResult`\>

***

### ownerDefineSecretTargets()

> **ownerDefineSecretTargets**(`command`): `Promise`\<`SecretRecord`\>

#### Parameters

##### command

`OwnerDefineSecretTargetsCommand`

#### Returns

`Promise`\<`SecretRecord`\>

***

### ownerDeleteSecret()

> **ownerDeleteSecret**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerDeleteSecretCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerExportSecret()

> **ownerExportSecret**(`actor`, `alias`, `request?`): `Promise`\<`OwnerSecretExport`\>

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

### ownerIssueAllAgentSessionTokens()

> **ownerIssueAllAgentSessionTokens**(`actor`): `Promise`\<`OwnerSessionToken`[]\>

#### Parameters

##### actor

`VaultPrincipal` & `object`

#### Returns

`Promise`\<`OwnerSessionToken`[]\>

***

### ownerIssueSessionToken()

> **ownerIssueSessionToken**(`request`): `Promise`\<`OwnerSessionToken`\>

#### Parameters

##### request

`OwnerIssueSessionTokenRequest`

#### Returns

`Promise`\<`OwnerSessionToken`\>

***

### ownerListAgents()

> **ownerListAgents**(`actor`, `request?`): `Promise`\<readonly `AgentIdentityRecord`[]\>

#### Parameters

##### actor

`VaultPrincipal` & `object`

##### request?

`Omit`\<`OwnerListAgentsRequest`, `"vaultId"` \| `"actor"`\>

#### Returns

`Promise`\<readonly `AgentIdentityRecord`[]\>

***

### ownerListCapabilities()

> **ownerListCapabilities**(`actor`, `agentId?`, `request?`): `Promise`\<readonly `AgentCapability`[]\>

#### Parameters

##### actor

`VaultPrincipal` & `object`

##### agentId?

`string`

##### request?

`Omit`\<`OwnerListCapabilitiesRequest`, `"agentId"` \| `"vaultId"` \| `"actor"`\>

#### Returns

`Promise`\<readonly `AgentCapability`[]\>

***

### ownerListPendingCapabilityRequests()

> **ownerListPendingCapabilityRequests**(`command`): `Promise`\<readonly `PendingCapabilityRequestRecord`[]\>

#### Parameters

##### command

###### owner

`VaultPrincipal`

###### vaultId

`VaultId`

#### Returns

`Promise`\<readonly `PendingCapabilityRequestRecord`[]\>

***

### ownerListPendingDispatches()

> **ownerListPendingDispatches**(`command`): `Promise`\<readonly `PendingDispatchRecord`[]\>

#### Parameters

##### command

###### owner

`VaultPrincipal`

###### vaultId

`VaultId`

#### Returns

`Promise`\<readonly `PendingDispatchRecord`[]\>

***

### ownerListSecrets()

> **ownerListSecrets**(`actor`, `request?`): `Promise`\<readonly `AgentVisibleSecretRecord`[]\>

#### Parameters

##### actor

`VaultPrincipal` & `object`

##### request?

###### requestId?

`string`

#### Returns

`Promise`\<readonly `AgentVisibleSecretRecord`[]\>

***

### ownerOnPendingCapabilityRequest()

> **ownerOnPendingCapabilityRequest**(`callback`): () => `void`

#### Parameters

##### callback

(`record`) => `void`

#### Returns

() => `void`

***

### ownerOnPendingDispatch()

> **ownerOnPendingDispatch**(`callback`): () => `void`

#### Parameters

##### callback

(`record`) => `void`

#### Returns

() => `void`

***

### ownerReadAudit()

> **ownerReadAudit**(`actor`, `query`, `request?`): `Promise`\<readonly `AuditEntry`[]\>

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

### ownerRegisterAgentIdentity()

> **ownerRegisterAgentIdentity**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRegisterAgentIdentityCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerRegisterCapability()

> **ownerRegisterCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRegisterCapabilityCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerRegisterCustomFlow()

> **ownerRegisterCustomFlow**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRegisterCustomHttpFlowCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerRejectCapabilityRequest()

> **ownerRejectCapabilityRequest**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRejectCapabilityRequestCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerRejectDispatch()

> **ownerRejectDispatch**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRejectDispatchCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeCapability()

> **ownerRevokeCapability**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRevokeCapabilityCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeSessionToken()

> **ownerRevokeSessionToken**(`request`): `Promise`\<`void`\>

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

### ownerSubmitCapabilityRequest()

> **ownerSubmitCapabilityRequest**(`command`): `Promise`\<`PendingCapabilityRequestRecord`\>

#### Parameters

##### command

`SubmitCapabilityRequestCommand`

#### Returns

`Promise`\<`PendingCapabilityRequestRecord`\>

***

### ownerWriteSecret()

> **ownerWriteSecret**(`command`): `Promise`\<`SecretRecord`\>

#### Parameters

##### command

`VaultWriteSecretCommand`

#### Returns

`Promise`\<`SecretRecord`\>
