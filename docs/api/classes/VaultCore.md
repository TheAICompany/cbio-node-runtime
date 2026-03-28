[**CBIO Node Runtime Agent API v1.63.7**](../README.md)

***

# Class: VaultCore

## Constructors

### Constructor

> **new VaultCore**(`deps`): `VaultCore`

#### Parameters

##### deps

`VaultCoreDependencies`

#### Returns

`VaultCore`

## Accessors

### vaultId

#### Get Signature

> **get** **vaultId**(): [`VaultId`](../interfaces/VaultId.md)

##### Returns

[`VaultId`](../interfaces/VaultId.md)

## Methods

### agentAuthorizeDispatch()

> **agentAuthorizeDispatch**(`request`): `Promise`\<[`DispatchAuthorization`](../interfaces/DispatchAuthorization.md)\>

#### Parameters

##### request

[`DispatchRequest`](../interfaces/DispatchRequest.md)

#### Returns

`Promise`\<[`DispatchAuthorization`](../interfaces/DispatchAuthorization.md)\>

***

### agentDispatchSecret()

> **agentDispatchSecret**(`request`): `Promise`\<[`DispatchResult`](../interfaces/DispatchResult.md)\>

#### Parameters

##### request

[`DispatchRequest`](../interfaces/DispatchRequest.md)

#### Returns

`Promise`\<[`DispatchResult`](../interfaces/DispatchResult.md)\>

***

### agentGetRequest()

> **agentGetRequest**(`command`): `Promise`\<`any`\>

#### Parameters

##### command

###### agent

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

###### proof

`any`

###### requestedAt

`string`

###### requestId

`string`

###### targetRequestId

`string`

#### Returns

`Promise`\<`any`\>

***

### agentGetRuntimeManifest()

> **agentGetRuntimeManifest**(`command`): `Promise`\<[`AgentRuntimeManifest`](../interfaces/AgentRuntimeManifest.md)\>

#### Parameters

##### command

###### agent

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

###### proof

`any`

###### requestedAt

`string`

###### requestId

`string`

#### Returns

`Promise`\<[`AgentRuntimeManifest`](../interfaces/AgentRuntimeManifest.md)\>

***

### agentListRequests()

> **agentListRequests**(`command`): `Promise`\<readonly [`AgentVisibleRequestRecord`](../interfaces/AgentVisibleRequestRecord.md)[]\>

#### Parameters

##### command

###### agent

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

###### proof

`any`

###### requestedAt

`string`

###### requestId

`string`

#### Returns

`Promise`\<readonly [`AgentVisibleRequestRecord`](../interfaces/AgentVisibleRequestRecord.md)[]\>

***

### agentListSecrets()

> **agentListSecrets**(`command`): `Promise`\<readonly [`AgentVisibleSecretRecord`](../interfaces/AgentVisibleSecretRecord.md)[]\>

#### Parameters

##### command

###### agent

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

###### proof

`any`

###### requestedAt

`string`

###### requestId

`string`

#### Returns

`Promise`\<readonly [`AgentVisibleSecretRecord`](../interfaces/AgentVisibleSecretRecord.md)[]\>

***

### ownerApproveDispatch()

> **ownerApproveDispatch**(`actor`, `requestId`, `decision`): `Promise`\<[`DispatchResult`](../interfaces/DispatchResult.md) \| `null`\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### requestId

`string`

##### decision

[`DispatchApprovalDecision`](../type-aliases/DispatchApprovalDecision.md)

#### Returns

`Promise`\<[`DispatchResult`](../interfaces/DispatchResult.md) \| `null`\>

***

### ownerCreateSecret()

> **ownerCreateSecret**(`command`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>

#### Parameters

##### command

`OwnerCreateSecretCommand`

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>

***

### ownerExportSecret()

> **ownerExportSecret**(`actor`, `alias`): `Promise`\<`OwnerSecretExport`\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### alias

`string`

#### Returns

`Promise`\<`OwnerSecretExport`\>

***

### ownerGetRequest()

> **ownerGetRequest**(`actor`, `requestId`): `Promise`\<[`OwnerRequestRecord`](../interfaces/OwnerRequestRecord.md)\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### requestId

`string`

#### Returns

`Promise`\<[`OwnerRequestRecord`](../interfaces/OwnerRequestRecord.md)\>

***

### ownerGrantAgentSecret()

> **ownerGrantAgentSecret**(`actor`, `rootAgentId`, `secretAlias`, `request?`): `Promise`\<[`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### rootAgentId

`string`

##### secretAlias

`string`

##### request?

###### requestId?

`string`

#### Returns

`Promise`\<[`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)\>

***

### ownerGrantSecretDestination()

> **ownerGrantSecretDestination**(`actor`, `secretAlias`, `siteId`, `request?`): `Promise`\<[`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### secretAlias

`string`

##### siteId

`string`

##### request?

###### requestId?

`string`

#### Returns

`Promise`\<[`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)\>

***

### ownerIssueAllAgentSessionTokens()

> **ownerIssueAllAgentSessionTokens**(`actor`): `Promise`\<`object`[]\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

#### Returns

`Promise`\<`object`[]\>

***

### ownerIssueSessionToken()

> **ownerIssueSessionToken**(`request`): `Promise`\<\{ `issuedAt`: `string`; `rootAgentId`: `string`; `token`: `string`; \}\>

#### Parameters

##### request

###### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md)

###### rootAgentId

`string`

###### vaultId

[`VaultId`](../interfaces/VaultId.md)

#### Returns

`Promise`\<\{ `issuedAt`: `string`; `rootAgentId`: `string`; `token`: `string`; \}\>

***

### ownerListAgents()

> **ownerListAgents**(`actor`): `Promise`\<readonly [`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)[]\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

#### Returns

`Promise`\<readonly [`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)[]\>

***

### ownerListGrants()

> **ownerListGrants**(`actor`, `rootAgentId?`, `secretAlias?`): `Promise`\<\{ `agentSecrets`: readonly [`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)[]; `secretDestinations`: readonly [`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)[]; \}\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### rootAgentId?

`string`

##### secretAlias?

`string`

#### Returns

`Promise`\<\{ `agentSecrets`: readonly [`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)[]; `secretDestinations`: readonly [`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)[]; \}\>

***

### ownerListRequests()

> **ownerListRequests**(`actor`, `rootAgentId?`): `Promise`\<readonly [`OwnerVisibleRequestRecord`](../interfaces/OwnerVisibleRequestRecord.md)[]\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### rootAgentId?

`string`

#### Returns

`Promise`\<readonly [`OwnerVisibleRequestRecord`](../interfaces/OwnerVisibleRequestRecord.md)[]\>

***

### ownerListSecrets()

> **ownerListSecrets**(`actor`): `Promise`\<readonly [`AgentVisibleSecretRecord`](../interfaces/AgentVisibleSecretRecord.md)[]\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

#### Returns

`Promise`\<readonly [`AgentVisibleSecretRecord`](../interfaces/AgentVisibleSecretRecord.md)[]\>

***

### ownerOnGrantState()

> **ownerOnGrantState**(`callback`): () => `void`

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

> **ownerReadAudit**(`actor`, `query`): `Promise`\<readonly [`AuditEntry`](../interfaces/AuditEntry.md)[]\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### query

`AuditQuery`

#### Returns

`Promise`\<readonly [`AuditEntry`](../interfaces/AuditEntry.md)[]\>

***

### ownerRegisterAgentIdentity()

> **ownerRegisterAgentIdentity**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

###### agentRecord

[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)

###### owner

[`VaultPrincipal`](../interfaces/VaultPrincipal.md)

###### requestedAt

`string`

###### requestId

`string`

###### vaultId

[`VaultId`](../interfaces/VaultId.md)

#### Returns

`Promise`\<`void`\>

***

### ownerRemoveSecret()

> **ownerRemoveSecret**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

###### alias

`string`

###### kind

`"owner.remove_secret"`

###### owner

[`VaultPrincipal`](../interfaces/VaultPrincipal.md)

###### requestedAt

`string`

###### requestId

`string`

###### vaultId

[`VaultId`](../interfaces/VaultId.md)

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeAgentSecret()

> **ownerRevokeAgentSecret**(`actor`, `rootAgentId`, `secretAlias`, `request?`): `Promise`\<`void`\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### rootAgentId

`string`

##### secretAlias

`string`

##### request?

###### requestId?

`string`

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeSecretDestination()

> **ownerRevokeSecretDestination**(`actor`, `secretAlias`, `siteId`, `request?`): `Promise`\<`void`\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### secretAlias

`string`

##### siteId

`string`

##### request?

###### requestId?

`string`

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeSessionToken()

> **ownerRevokeSessionToken**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

###### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md)

###### token

`string`

###### vaultId

[`VaultId`](../interfaces/VaultId.md)

#### Returns

`Promise`\<`void`\>

***

### ownerUpdateAgentIdentity()

> **ownerUpdateAgentIdentity**(`command`): `Promise`\<[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)\>

#### Parameters

##### command

###### metadata?

`Record`\<`string`, `any`\>

###### nickname?

`string`

###### owner

[`VaultPrincipal`](../interfaces/VaultPrincipal.md)

###### requestedAt

`string`

###### requestId

`string`

###### rootAgentId

`string`

###### vaultId

[`VaultId`](../interfaces/VaultId.md)

#### Returns

`Promise`\<[`AgentIdentityRecord`](../interfaces/AgentIdentityRecord.md)\>

***

### ownerUpdateSecret()

> **ownerUpdateSecret**(`command`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>

#### Parameters

##### command

`OwnerUpdateSecretCommand`

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>

***

### ownerWriteSecret()

> **ownerWriteSecret**(`command`): `Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>

#### Parameters

##### command

`any`

#### Returns

`Promise`\<[`SecretRecord`](../interfaces/SecretRecord.md)\>
