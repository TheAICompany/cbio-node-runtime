[**CBIO Node Runtime Agent API v1.71.0**](../README.md)

***

# Interface: VaultService

## Properties

### vault\_id

> `readonly` **vault\_id**: [`VaultId`](VaultId.md)

## Methods

### agentDispatch()

> **agentDispatch**(`request`): `Promise`\<[`DispatchResult`](DispatchResult.md)\>

#### Parameters

##### request

[`DispatchRequest`](DispatchRequest.md)

#### Returns

`Promise`\<[`DispatchResult`](DispatchResult.md)\>

***

### agentGetRequest()

> **agentGetRequest**(`request`): `Promise`\<[`AgentRequestRecord`](AgentRequestRecord.md)\>

#### Parameters

##### request

`AgentGetRequestRequest`

#### Returns

`Promise`\<[`AgentRequestRecord`](AgentRequestRecord.md)\>

***

### agentGetRuntimeManifest()

> **agentGetRuntimeManifest**(`request`): `Promise`\<[`AgentRuntimeManifest`](AgentRuntimeManifest.md)\>

#### Parameters

##### request

`AgentGetRuntimeManifestRequest`

#### Returns

`Promise`\<[`AgentRuntimeManifest`](AgentRuntimeManifest.md)\>

***

### agentHandleControl()

> **agentHandleControl**(`request`): `Promise`\<`VaultAgentControlResponse` \| `VaultAgentControlErrorResponse`\>

#### Parameters

##### request

`VaultAgentControlRequest`

#### Returns

`Promise`\<`VaultAgentControlResponse` \| `VaultAgentControlErrorResponse`\>

***

### agentHandleDispatch()

> **agentHandleDispatch**(`request`): `Promise`\<`VaultAgentDispatchResponse` \| `VaultAgentDispatchErrorResponse`\>

#### Parameters

##### request

`VaultAgentDispatchRequest`

#### Returns

`Promise`\<`VaultAgentDispatchResponse` \| `VaultAgentDispatchErrorResponse`\>

***

### agentListRequests()

> **agentListRequests**(`request`): `Promise`\<readonly [`AgentVisibleRequestRecord`](AgentVisibleRequestRecord.md)[]\>

#### Parameters

##### request

`AgentListRequestsRequest`

#### Returns

`Promise`\<readonly [`AgentVisibleRequestRecord`](AgentVisibleRequestRecord.md)[]\>

***

### agentListSecrets()

> **agentListSecrets**(`request`): `Promise`\<readonly [`AgentVisibleSecretRecord`](AgentVisibleSecretRecord.md)[]\>

#### Parameters

##### request

`AgentListSecretsRequest`

#### Returns

`Promise`\<readonly [`AgentVisibleSecretRecord`](AgentVisibleSecretRecord.md)[]\>

***

### ownerApproveDispatch()

> **ownerApproveDispatch**(`request`): `Promise`\<[`DispatchResult`](DispatchResult.md) \| `null`\>

#### Parameters

##### request

`OwnerApproveDispatchCommand`

#### Returns

`Promise`\<[`DispatchResult`](DispatchResult.md) \| `null`\>

***

### ownerCreateSecret()

> **ownerCreateSecret**(`request`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

#### Parameters

##### request

`OwnerCreateSecretCommand`

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>

***

### ownerExportSecret()

> **ownerExportSecret**(`request`): `Promise`\<`OwnerSecretExport`\>

#### Parameters

##### request

`OwnerExportSecretRequest`

#### Returns

`Promise`\<`OwnerSecretExport`\>

***

### ownerGetRequest()

> **ownerGetRequest**(`request`): `Promise`\<[`OwnerRequestRecord`](OwnerRequestRecord.md)\>

#### Parameters

##### request

`OwnerGetRequestRequest`

#### Returns

`Promise`\<[`OwnerRequestRecord`](OwnerRequestRecord.md)\>

***

### ownerGrantAgentSecret()

> **ownerGrantAgentSecret**(`request`): `Promise`\<[`AgentSecretGrant`](AgentSecretGrant.md)\>

#### Parameters

##### request

`OwnerGrantAgentSecretCommand`

#### Returns

`Promise`\<[`AgentSecretGrant`](AgentSecretGrant.md)\>

***

### ownerGrantSecretDestination()

> **ownerGrantSecretDestination**(`request`): `Promise`\<[`SecretDestinationGrant`](SecretDestinationGrant.md)\>

#### Parameters

##### request

`OwnerGrantSecretDestinationCommand`

#### Returns

`Promise`\<[`SecretDestinationGrant`](SecretDestinationGrant.md)\>

***

### ownerHandleControl()

> **ownerHandleControl**(`request`): `Promise`\<`VaultOwnerControlResponse` \| `VaultOwnerControlErrorResponse`\>

#### Parameters

##### request

`VaultOwnerControlRequest`

#### Returns

`Promise`\<`VaultOwnerControlResponse` \| `VaultOwnerControlErrorResponse`\>

***

### ownerIssueAllAgentSessionTokens()

> **ownerIssueAllAgentSessionTokens**(`actor`): `Promise`\<`OwnerSessionToken`[]\>

#### Parameters

##### actor

[`VaultPrincipal`](VaultPrincipal.md) & `object`

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

> **ownerListAgents**(`request`): `Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

#### Parameters

##### request

`OwnerListAgentsRequest`

#### Returns

`Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

***

### ownerListGrants()

> **ownerListGrants**(`request`): `Promise`\<\{ `agent_secrets`: readonly [`AgentSecretGrant`](AgentSecretGrant.md)[]; `secret_destinations`: readonly [`SecretDestinationGrant`](SecretDestinationGrant.md)[]; \}\>

#### Parameters

##### request

`OwnerListGrantsRequest`

#### Returns

`Promise`\<\{ `agent_secrets`: readonly [`AgentSecretGrant`](AgentSecretGrant.md)[]; `secret_destinations`: readonly [`SecretDestinationGrant`](SecretDestinationGrant.md)[]; \}\>

***

### ownerListRequests()

> **ownerListRequests**(`request`): `Promise`\<readonly [`OwnerVisibleRequestRecord`](OwnerVisibleRequestRecord.md)[]\>

#### Parameters

##### request

`OwnerListRequestsRequest`

#### Returns

`Promise`\<readonly [`OwnerVisibleRequestRecord`](OwnerVisibleRequestRecord.md)[]\>

***

### ownerListSecrets()

> **ownerListSecrets**(`request`): `Promise`\<readonly [`AgentVisibleSecretRecord`](AgentVisibleSecretRecord.md)[]\>

#### Parameters

##### request

###### owner

[`VaultPrincipal`](VaultPrincipal.md)

###### request_id?

`string`

###### vault_id

[`VaultId`](VaultId.md)

#### Returns

`Promise`\<readonly [`AgentVisibleSecretRecord`](AgentVisibleSecretRecord.md)[]\>

***

### ownerOnAudit()

> **ownerOnAudit**(`subscription`): () => `void`

#### Parameters

##### subscription

[`OwnerAuditSubscription`](OwnerAuditSubscription.md)

#### Returns

() => `void`

***

### ownerOnPendingDispatch()

> **ownerOnPendingDispatch**(`subscription`): () => `void`

#### Parameters

##### subscription

[`OwnerPendingDispatchSubscription`](OwnerPendingDispatchSubscription.md)

#### Returns

() => `void`

***

### ownerReadAudit()

> **ownerReadAudit**(`request`): `Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>

#### Parameters

##### request

`OwnerAuditRequest`

#### Returns

`Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>

***

### ownerRegisterAgentIdentity()

> **ownerRegisterAgentIdentity**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

`OwnerRegisterAgentIdentityCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerRemoveSecret()

> **ownerRemoveSecret**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

`OwnerDeleteSecretCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeAgentSecret()

> **ownerRevokeAgentSecret**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

`OwnerRevokeAgentSecretCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeSecretDestination()

> **ownerRevokeSecretDestination**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

`OwnerRevokeSecretDestinationCommand`

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeSessionToken()

> **ownerRevokeSessionToken**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

###### actor

[`VaultPrincipal`](VaultPrincipal.md) & `object`

###### token

`string`

###### vault_id

[`VaultId`](VaultId.md)

#### Returns

`Promise`\<`void`\>

***

### ownerUpdateAgentIdentity()

> **ownerUpdateAgentIdentity**(`request`): `Promise`\<[`AgentIdentityRecord`](AgentIdentityRecord.md)\>

#### Parameters

##### request

`OwnerUpdateAgentIdentityCommand`

#### Returns

`Promise`\<[`AgentIdentityRecord`](AgentIdentityRecord.md)\>

***

### ownerUpdateSecret()

> **ownerUpdateSecret**(`request`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

#### Parameters

##### request

`OwnerUpdateSecretCommand`

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>
