[**CBIO Node Runtime Agent API v1.63.3**](../README.md)

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

### \_getGrant()

> **\_getGrant**(`vaultId`, `rootAgentId`, `grantId`): `Promise`\<`AgentGrant` \| `null`\>

#### Parameters

##### vaultId

`VaultId`

##### rootAgentId

`string`

##### grantId

`string`

#### Returns

`Promise`\<`AgentGrant` \| `null`\>

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

### agentGetRequest()

> **agentGetRequest**(`request`): `Promise`\<`AgentRequestResult`\>

#### Parameters

##### request

`AgentGetRequestRequest`

#### Returns

`Promise`\<`AgentRequestResult`\>

***

### agentGetRuntimeManifest()

> **agentGetRuntimeManifest**(`command`): `Promise`\<`AgentRuntimeManifest`\>

#### Parameters

##### command

`AgentGetRuntimeManifestRequest`

#### Returns

`Promise`\<`AgentRuntimeManifest`\>

***

### agentListCapabilities()

> **agentListCapabilities**(`request`): `Promise`\<readonly `AgentGrantState`[]\>

#### Parameters

##### request

`AgentListCapabilitiesRequest`

#### Returns

`Promise`\<readonly `AgentGrantState`[]\>

***

### agentListRequests()

> **agentListRequests**(`request`): `Promise`\<readonly `AgentVisibleRequestRecord`[]\>

#### Parameters

##### request

`AgentListRequestsRequest`

#### Returns

`Promise`\<readonly `AgentVisibleRequestRecord`[]\>

***

### agentListSecrets()

> **agentListSecrets**(`request`): `Promise`\<readonly `AgentVisibleSecretRecord`[]\>

#### Parameters

##### request

`AgentListSecretsRequest`

#### Returns

`Promise`\<readonly `AgentVisibleSecretRecord`[]\>

***

### agentSubmitGrantRequest()

> **agentSubmitGrantRequest**(`command`): `Promise`\<`GrantStateRecord`\>

#### Parameters

##### command

`AgentSubmitGrantRequestCommand`

#### Returns

`Promise`\<`GrantStateRecord`\>

***

### ownerAllowAlways()

> **ownerAllowAlways**(`command`): `Promise`\<`DispatchResult`\>

#### Parameters

##### command

`OwnerAllowAlwaysCommand`

#### Returns

`Promise`\<`DispatchResult`\>

***

### ownerAllowOnce()

> **ownerAllowOnce**(`command`): `Promise`\<`DispatchResult`\>

#### Parameters

##### command

`OwnerAllowOnceCommand`

#### Returns

`Promise`\<`DispatchResult`\>

***

### ownerApproveGrantRead()

> **ownerApproveGrantRead**(`command`): `Promise`\<`GrantStateRecord`\>

#### Parameters

##### command

`OwnerApproveGrantReadCommand`

#### Returns

`Promise`\<`GrantStateRecord`\>

***

### ownerCreateSecret()

> **ownerCreateSecret**(`command`): `Promise`\<`SecretRecord`\>

#### Parameters

##### command

`OwnerCreateSecretCommand`

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

### ownerDeny()

> **ownerDeny**(`command`): `Promise`\<`GrantStateRecord`\>

#### Parameters

##### command

`OwnerDenyCommand`

#### Returns

`Promise`\<`GrantStateRecord`\>

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

### ownerGetRequest()

> **ownerGetRequest**(`actor`, `targetRequestId`, `request?`): `Promise`\<`OwnerRequestRecord`\>

#### Parameters

##### actor

`VaultPrincipal` & `object`

##### targetRequestId

`string`

##### request?

`Omit`\<`OwnerGetRequestRequest`, `"vaultId"` \| `"actor"` \| `"targetRequestId"`\>

#### Returns

`Promise`\<`OwnerRequestRecord`\>

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

> **ownerListCapabilities**(`actor`, `rootAgentId?`, `request?`): `Promise`\<readonly `AgentGrant`[]\>

#### Parameters

##### actor

`VaultPrincipal` & `object`

##### rootAgentId?

`string`

##### request?

`Omit`\<`OwnerListCapabilitiesRequest`, `"rootAgentId"` \| `"vaultId"` \| `"actor"`\>

#### Returns

`Promise`\<readonly `AgentGrant`[]\>

***

### ownerListGrantStates()

> **ownerListGrantStates**(`command`): `Promise`\<readonly `GrantStateRecord`[]\>

#### Parameters

##### command

`OwnerListGrantStatesRequest`

#### Returns

`Promise`\<readonly `GrantStateRecord`[]\>

***

### ownerListRequests()

> **ownerListRequests**(`actor`, `rootAgentId?`, `request?`): `Promise`\<readonly `OwnerVisibleRequestRecord`[]\>

#### Parameters

##### actor

`VaultPrincipal` & `object`

##### rootAgentId?

`string`

##### request?

`Omit`\<`OwnerListRequestsRequest`, `"rootAgentId"` \| `"vaultId"` \| `"actor"`\>

#### Returns

`Promise`\<readonly `OwnerVisibleRequestRecord`[]\>

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

### ownerOnGrantState()

> **ownerOnGrantState**(`callback`): () => `void`

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

### ownerRegisterGrant()

> **ownerRegisterGrant**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRegisterGrantCommand`

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

### ownerRemoveSecret()

> **ownerRemoveSecret**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerDeleteSecretCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeGrant()

> **ownerRevokeGrant**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

`OwnerRevokeGrantCommand`

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

### ownerSubmitGrantRequest()

> **ownerSubmitGrantRequest**(`command`): `Promise`\<`GrantStateRecord`\>

#### Parameters

##### command

`SubmitGrantRequestCommand`

#### Returns

`Promise`\<`GrantStateRecord`\>

***

### ownerUpdateAgentIdentity()

> **ownerUpdateAgentIdentity**(`command`): `Promise`\<`AgentIdentityRecord`\>

#### Parameters

##### command

`OwnerUpdateAgentIdentityCommand`

#### Returns

`Promise`\<`AgentIdentityRecord`\>

***

### ownerUpdateSecret()

> **ownerUpdateSecret**(`command`): `Promise`\<`SecretRecord`\>

#### Parameters

##### command

`OwnerUpdateSecretCommand`

#### Returns

`Promise`\<`SecretRecord`\>

***

### ownerWriteSecret()

> **ownerWriteSecret**(`command`): `Promise`\<`SecretRecord`\>

#### Parameters

##### command

`VaultWriteSecretCommand`

#### Returns

`Promise`\<`SecretRecord`\>
