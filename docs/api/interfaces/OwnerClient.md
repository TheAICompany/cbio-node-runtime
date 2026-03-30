[**CBIO Node Runtime Agent API v1.72.0**](../README.md)

***

# Interface: OwnerClient

A client for vault owners to manage secrets, agents, and grants.

## Methods

### ownerApproveDispatch()

> **ownerApproveDispatch**(`input`): `Promise`\<[`DispatchResult`](DispatchResult.md) \| `null`\>

#### Parameters

##### input

[`VaultApproveDispatchInput`](VaultApproveDispatchInput.md)

#### Returns

`Promise`\<[`DispatchResult`](DispatchResult.md) \| `null`\>

***

### ownerCreateAgent()

> **ownerCreateAgent**(`input`): `Promise`\<[`OwnerAgentProvisionResult`](OwnerAgentProvisionResult.md)\>

#### Parameters

##### input

[`VaultCreateAgentInput`](VaultCreateAgentInput.md)

#### Returns

`Promise`\<[`OwnerAgentProvisionResult`](OwnerAgentProvisionResult.md)\>

***

### ownerCreateSecret()

#### Call Signature

> **ownerCreateSecret**(`input`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

##### Parameters

###### input

[`OwnerCreateSecretInput`](OwnerCreateSecretInput.md)

##### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>

#### Call Signature

> **ownerCreateSecret**(`input`): `Promise`\<[`SecretRecord`](SecretRecord.md)[]\>

##### Parameters

###### input

[`OwnerCreateSecretInput`](OwnerCreateSecretInput.md)[]

##### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)[]\>

***

### ownerDenyDispatch()

> **ownerDenyDispatch**(`request_id`): `Promise`\<`void`\>

#### Parameters

##### request\_id

`string`

#### Returns

`Promise`\<`void`\>

***

### ownerExportSecret()

> **ownerExportSecret**(`input`): `Promise`\<readonly `OwnerSecretExport`[]\>

#### Parameters

##### input

[`VaultExportSecretInput`](VaultExportSecretInput.md)

#### Returns

`Promise`\<readonly `OwnerSecretExport`[]\>

***

### ownerGetRequest()

> **ownerGetRequest**(`input`): `Promise`\<[`OwnerRequestRecord`](OwnerRequestRecord.md)\>

#### Parameters

##### input

[`VaultGetRequestInput`](VaultGetRequestInput.md)

#### Returns

`Promise`\<[`OwnerRequestRecord`](OwnerRequestRecord.md)\>

***

### ownerGrantAgentSecret()

> **ownerGrantAgentSecret**(`input`): `Promise`\<[`AgentSecretGrant`](AgentSecretGrant.md)\>

#### Parameters

##### input

[`VaultGrantAgentSecretInput`](VaultGrantAgentSecretInput.md)

#### Returns

`Promise`\<[`AgentSecretGrant`](AgentSecretGrant.md)\>

***

### ownerGrantSecretDestination()

> **ownerGrantSecretDestination**(`input`): `Promise`\<[`SecretDestinationGrant`](SecretDestinationGrant.md)\>

#### Parameters

##### input

[`VaultGrantSecretDestinationInput`](VaultGrantSecretDestinationInput.md)

#### Returns

`Promise`\<[`SecretDestinationGrant`](SecretDestinationGrant.md)\>

***

### ownerImportAgent()

> **ownerImportAgent**(`input`): `Promise`\<[`OwnerAgentProvisionResult`](OwnerAgentProvisionResult.md)\>

#### Parameters

##### input

[`VaultImportAgentInput`](VaultImportAgentInput.md)

#### Returns

`Promise`\<[`OwnerAgentProvisionResult`](OwnerAgentProvisionResult.md)\>

***

### ownerIssueAllSessionTokens()

> **ownerIssueAllSessionTokens**(): `Promise`\<readonly `OwnerSessionToken`[]\>

#### Returns

`Promise`\<readonly `OwnerSessionToken`[]\>

***

### ownerIssueSessionToken()

> **ownerIssueSessionToken**(`input`): `Promise`\<`OwnerSessionToken`\>

#### Parameters

##### input

[`VaultIssueSessionTokenInput`](VaultIssueSessionTokenInput.md)

#### Returns

`Promise`\<`OwnerSessionToken`\>

***

### ownerListAgents()

> **ownerListAgents**(`input?`): `Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

#### Parameters

##### input?

[`VaultListAgentsInput`](VaultListAgentsInput.md)

#### Returns

`Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

***

### ownerListGrants()

> **ownerListGrants**(`input?`): `Promise`\<\{ `agent_secrets`: readonly [`AgentSecretGrant`](AgentSecretGrant.md)[]; `secret_destinations`: readonly [`SecretDestinationGrant`](SecretDestinationGrant.md)[]; \}\>

#### Parameters

##### input?

[`VaultListGrantsInput`](VaultListGrantsInput.md)

#### Returns

`Promise`\<\{ `agent_secrets`: readonly [`AgentSecretGrant`](AgentSecretGrant.md)[]; `secret_destinations`: readonly [`SecretDestinationGrant`](SecretDestinationGrant.md)[]; \}\>

***

### ownerListRequests()

> **ownerListRequests**(`input?`): `Promise`\<readonly [`OwnerVisibleRequestRecord`](OwnerVisibleRequestRecord.md)[]\>

#### Parameters

##### input?

[`VaultListRequestsInput`](VaultListRequestsInput.md)

#### Returns

`Promise`\<readonly [`OwnerVisibleRequestRecord`](OwnerVisibleRequestRecord.md)[]\>

***

### ownerListSecrets()

> **ownerListSecrets**(`input?`): `Promise`\<readonly [`AgentVisibleSecretRecord`](AgentVisibleSecretRecord.md)[]\>

#### Parameters

##### input?

[`VaultListSecretsInput`](VaultListSecretsInput.md)

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

### ownerReadAgentPrivateKey()

> **ownerReadAgentPrivateKey**(`input`): `Promise`\<`string`\>

#### Parameters

##### input

[`VaultReadAgentPrivateKeyInput`](VaultReadAgentPrivateKeyInput.md)

#### Returns

`Promise`\<`string`\>

***

### ownerReadAudit()

> **ownerReadAudit**(`query?`): `Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>

#### Parameters

##### query?

[`VaultAuditQueryInput`](VaultAuditQueryInput.md)

#### Returns

`Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>

***

### ownerReadSecretPlaintext()

> **ownerReadSecretPlaintext**(`input`): `Promise`\<`string`\>

#### Parameters

##### input

[`VaultReadSecretPlaintextInput`](VaultReadSecretPlaintextInput.md)

#### Returns

`Promise`\<`string`\>

***

### ownerRemoveSecret()

> **ownerRemoveSecret**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

[`OwnerRemoveSecretInput`](OwnerRemoveSecretInput.md)

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeAgentSecret()

> **ownerRevokeAgentSecret**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

[`VaultRevokeAgentSecretInput`](VaultRevokeAgentSecretInput.md)

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeSecretDestination()

> **ownerRevokeSecretDestination**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

[`VaultRevokeSecretDestinationInput`](VaultRevokeSecretDestinationInput.md)

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeSessionToken()

> **ownerRevokeSessionToken**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

[`VaultRevokeSessionTokenInput`](VaultRevokeSessionTokenInput.md)

#### Returns

`Promise`\<`void`\>

***

### ownerUpdateAgent()

> **ownerUpdateAgent**(`input`): `Promise`\<[`AgentIdentityRecord`](AgentIdentityRecord.md)\>

#### Parameters

##### input

[`VaultUpdateAgentInput`](VaultUpdateAgentInput.md)

#### Returns

`Promise`\<[`AgentIdentityRecord`](AgentIdentityRecord.md)\>

***

### ownerUpdateSecret()

#### Call Signature

> **ownerUpdateSecret**(`input`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

##### Parameters

###### input

[`OwnerUpdateSecretInput`](OwnerUpdateSecretInput.md)

##### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>

#### Call Signature

> **ownerUpdateSecret**(`input`): `Promise`\<[`SecretRecord`](SecretRecord.md)[]\>

##### Parameters

###### input

[`OwnerUpdateSecretInput`](OwnerUpdateSecretInput.md)[]

##### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)[]\>
