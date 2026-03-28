[**CBIO Node Runtime Agent API v1.63.3**](../README.md)

***

# Interface: OwnerClient

A client for vault owners to manage secrets, agents, and capabilities.
In Sovereign Vault model, administrative actions are implicitly authorized by the working key.

## Methods

### ownerAllowAlways()

> **ownerAllowAlways**(`input`): `Promise`\<`DispatchResult`\>

#### Parameters

##### input

[`VaultApproveGrantRequestInput`](VaultApproveGrantRequestInput.md)

#### Returns

`Promise`\<`DispatchResult`\>

***

### ownerAllowOnce()

> **ownerAllowOnce**(`input`): `Promise`\<`DispatchResult`\>

#### Parameters

##### input

[`VaultApproveGrantRequestInput`](VaultApproveGrantRequestInput.md)

#### Returns

`Promise`\<`DispatchResult`\>

***

### ownerApproveGrantRead()

> **ownerApproveGrantRead**(`input`): `Promise`\<`GrantStateRecord`\>

#### Parameters

##### input

[`VaultApproveGrantRequestInput`](VaultApproveGrantRequestInput.md)

#### Returns

`Promise`\<`GrantStateRecord`\>

***

### ownerCreateAgent()

> **ownerCreateAgent**(`input`): `Promise`\<[`OwnerAgentProvisionResult`](OwnerAgentProvisionResult.md)\>

Generates a new identity and registers it as an agent in one step.
The private key is stored in the vault for managed custody.

#### Parameters

##### input

[`VaultCreateAgentInput`](VaultCreateAgentInput.md)

#### Returns

`Promise`\<[`OwnerAgentProvisionResult`](OwnerAgentProvisionResult.md)\>

***

### ownerCreateSecret()

> **ownerCreateSecret**(`input`): `Promise`\<`SecretRecord`\>

Inserts a new active secret into the vault.

#### Parameters

##### input

[`OwnerCreateSecretInput`](OwnerCreateSecretInput.md)

#### Returns

`Promise`\<`SecretRecord`\>

***

### ownerDeny()

> **ownerDeny**(`requestId`): `Promise`\<`GrantStateRecord`\>

#### Parameters

##### requestId

`string`

#### Returns

`Promise`\<`GrantStateRecord`\>

***

### ownerExportSecret()

> **ownerExportSecret**(`input`): `Promise`\<`OwnerSecretExport`\>

Exports a secret's plaintext.

#### Parameters

##### input

[`VaultExportSecretInput`](VaultExportSecretInput.md)

#### Returns

`Promise`\<`OwnerSecretExport`\>

***

### ownerGetRequest()

> **ownerGetRequest**(`input`): `Promise`\<`OwnerRequestRecord`\>

#### Parameters

##### input

`VaultGetRequestInput`

#### Returns

`Promise`\<`OwnerRequestRecord`\>

***

### ownerGrantGrant()

> **ownerGrantGrant**(`input`): `Promise`\<`AgentGrant`\>

Grants a specific grant to an agent.

#### Parameters

##### input

[`OwnerGrantGrantInput`](../type-aliases/OwnerGrantGrantInput.md)

#### Returns

`Promise`\<`AgentGrant`\>

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

> **ownerListAgents**(`input?`): `Promise`\<readonly `AgentIdentityRecord`[]\>

Lists all agents registered in the vault.

#### Parameters

##### input?

[`VaultListAgentsInput`](VaultListAgentsInput.md)

#### Returns

`Promise`\<readonly `AgentIdentityRecord`[]\>

***

### ownerListCapabilities()

> **ownerListCapabilities**(`input?`): `Promise`\<readonly `AgentGrant`[]\>

Lists all active capabilities granted to agents.

#### Parameters

##### input?

[`VaultListCapabilitiesInput`](VaultListCapabilitiesInput.md)

#### Returns

`Promise`\<readonly `AgentGrant`[]\>

***

### ownerListGrantStates()

> **ownerListGrantStates**(`input?`): `Promise`\<readonly `GrantStateRecord`[]\>

#### Parameters

##### input?

`VaultListGrantStatesInput`

#### Returns

`Promise`\<readonly `GrantStateRecord`[]\>

***

### ownerListRequests()

> **ownerListRequests**(`input?`): `Promise`\<readonly `OwnerVisibleRequestRecord`[]\>

#### Parameters

##### input?

`VaultListRequestsInput`

#### Returns

`Promise`\<readonly `OwnerVisibleRequestRecord`[]\>

***

### ownerListSecrets()

> **ownerListSecrets**(`input?`): `Promise`\<readonly `AgentVisibleSecretRecord`[]\>

#### Parameters

##### input?

[`VaultListSecretsInput`](VaultListSecretsInput.md)

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

### ownerReadAgentPrivateKey()

> **ownerReadAgentPrivateKey**(`input`): `Promise`\<`string`\>

#### Parameters

##### input

[`VaultReadAgentPrivateKeyInput`](VaultReadAgentPrivateKeyInput.md)

#### Returns

`Promise`\<`string`\>

***

### ownerReadAudit()

> **ownerReadAudit**(`query?`): `Promise`\<readonly `AuditEntry`[]\>

Reads the tamper-evident audit log for the vault.

#### Parameters

##### query?

[`VaultAuditQueryInput`](VaultAuditQueryInput.md)

#### Returns

`Promise`\<readonly `AuditEntry`[]\>

***

### ownerReadSecretPlaintext()

> **ownerReadSecretPlaintext**(`input`): `Promise`\<`string`\>

#### Parameters

##### input

[`VaultReadSecretPlaintextInput`](VaultReadSecretPlaintextInput.md)

#### Returns

`Promise`\<`string`\>

***

### ownerRegisterFlow()

> **ownerRegisterFlow**(`input`): `Promise`\<`CustomHttpFlowDefinition`\>

Registers a reusable HTTP request template for complex secret exchange patterns.

#### Parameters

##### input

[`VaultRegisterFlowInput`](VaultRegisterFlowInput.md)

#### Returns

`Promise`\<`CustomHttpFlowDefinition`\>

***

### ownerRemoveSecret()

> **ownerRemoveSecret**(`input`): `Promise`\<`void`\>

Logically removes the current active secret.

#### Parameters

##### input

[`OwnerRemoveSecretInput`](OwnerRemoveSecretInput.md)

#### Returns

`Promise`\<`void`\>

***

### ownerRevokeGrant()

> **ownerRevokeGrant**(`input`): `Promise`\<`void`\>

Revokes a previously granted grant.

#### Parameters

##### input

[`VaultRevokeGrantInput`](VaultRevokeGrantInput.md)

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

### ownerSubmitGrantRequest()

> **ownerSubmitGrantRequest**(`input`): `Promise`\<`GrantStateRecord`\>

#### Parameters

##### input

[`VaultSubmitGrantRequestInput`](VaultSubmitGrantRequestInput.md)

#### Returns

`Promise`\<`GrantStateRecord`\>

***

### ownerUpdateAgent()

> **ownerUpdateAgent**(`input`): `Promise`\<`AgentIdentityRecord`\>

#### Parameters

##### input

[`VaultUpdateAgentInput`](VaultUpdateAgentInput.md)

#### Returns

`Promise`\<`AgentIdentityRecord`\>

***

### ownerUpdateSecret()

> **ownerUpdateSecret**(`input`): `Promise`\<`SecretRecord`\>

Inserts a new successor secret and marks the previous active version as superseded.

#### Parameters

##### input

[`OwnerUpdateSecretInput`](OwnerUpdateSecretInput.md)

#### Returns

`Promise`\<`SecretRecord`\>
