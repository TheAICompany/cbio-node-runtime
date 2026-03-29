[**CBIO Node Runtime Agent API v1.68.0**](../README.md)

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

### vault\_id

#### Get Signature

> **get** **vault\_id**(): [`VaultId`](../interfaces/VaultId.md)

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

###### request_id

`string`

###### requested_at

`string`

###### target_request_id

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

###### request_id

`string`

###### requested_at

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

###### request_id

`string`

###### requested_at

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

###### request_id

`string`

###### requested_at

`string`

#### Returns

`Promise`\<readonly [`AgentVisibleSecretRecord`](../interfaces/AgentVisibleSecretRecord.md)[]\>

***

### ownerApproveDispatch()

> **ownerApproveDispatch**(`actor`, `request_id`, `decision`): `Promise`\<[`DispatchResult`](../interfaces/DispatchResult.md) \| `null`\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### request\_id

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

> **ownerGetRequest**(`actor`, `request_id`): `Promise`\<[`OwnerRequestRecord`](../interfaces/OwnerRequestRecord.md)\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### request\_id

`string`

#### Returns

`Promise`\<[`OwnerRequestRecord`](../interfaces/OwnerRequestRecord.md)\>

***

### ownerGrantAgentSecret()

> **ownerGrantAgentSecret**(`actor`, `root_agent_id`, `secret_alias`, `request?`): `Promise`\<[`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### root\_agent\_id

`string`

##### secret\_alias

`string`

##### request?

###### request_id?

`string`

#### Returns

`Promise`\<[`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)\>

***

### ownerGrantSecretDestination()

> **ownerGrantSecretDestination**(`actor`, `secret_alias`, `site_id`, `request?`): `Promise`\<[`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### secret\_alias

`string`

##### site\_id

`string`

##### request?

###### request_id?

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

> **ownerIssueSessionToken**(`request`): `Promise`\<\{ `issued_at`: `string`; `root_agent_id`: `string`; `token`: `string`; \}\>

#### Parameters

##### request

###### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md)

###### root_agent_id

`string`

###### vault_id

[`VaultId`](../interfaces/VaultId.md)

#### Returns

`Promise`\<\{ `issued_at`: `string`; `root_agent_id`: `string`; `token`: `string`; \}\>

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

> **ownerListGrants**(`actor`, `root_agent_id?`, `secret_alias?`): `Promise`\<\{ `agent_secrets`: readonly [`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)[]; `secret_destinations`: readonly [`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)[]; \}\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### root\_agent\_id?

`string`

##### secret\_alias?

`string`

#### Returns

`Promise`\<\{ `agent_secrets`: readonly [`AgentSecretGrant`](../interfaces/AgentSecretGrant.md)[]; `secret_destinations`: readonly [`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)[]; \}\>

***

### ownerListRequests()

> **ownerListRequests**(`actor`, `root_agent_id?`): `Promise`\<readonly [`OwnerVisibleRequestRecord`](../interfaces/OwnerVisibleRequestRecord.md)[]\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### root\_agent\_id?

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

###### request_id

`string`

###### requested_at

`string`

###### vault_id

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

###### request_id

`string`

###### requested_at

`string`

###### vault_id

[`VaultId`](../interfaces/VaultId.md)

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeAgentSecret()

> **ownerRevokeAgentSecret**(`actor`, `root_agent_id`, `secret_alias`, `request?`): `Promise`\<`void`\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### root\_agent\_id

`string`

##### secret\_alias

`string`

##### request?

###### request_id?

`string`

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeSecretDestination()

> **ownerRevokeSecretDestination**(`actor`, `secret_alias`, `site_id`, `request?`): `Promise`\<`void`\>

#### Parameters

##### actor

[`VaultPrincipal`](../interfaces/VaultPrincipal.md) & `object`

##### secret\_alias

`string`

##### site\_id

`string`

##### request?

###### request_id?

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

###### vault_id

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

###### request_id

`string`

###### requested_at

`string`

###### root_agent_id

`string`

###### vault_id

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
