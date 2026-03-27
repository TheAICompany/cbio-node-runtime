[**CBIO Node Runtime Agent API v1.58.0**](../README.md)

***

# Interface: VaultClient

A client for vault owners to manage secrets, agents, and capabilities.
In Sovereign Vault model, administrative actions are implicitly authorized by the working key.

## Methods

### ownerApproveCapabilityRead()

> **ownerApproveCapabilityRead**(`input`): `Promise`\<`CapabilityStateRecord`\>

#### Parameters

##### input

[`VaultApproveCapabilityRequestInput`](VaultApproveCapabilityRequestInput.md)

#### Returns

`Promise`\<`CapabilityStateRecord`\>

***

### ownerApproveCapabilityWrite()

> **ownerApproveCapabilityWrite**(`input`): `Promise`\<`CapabilityStateRecord`\>

#### Parameters

##### input

[`VaultApproveCapabilityRequestInput`](VaultApproveCapabilityRequestInput.md)

#### Returns

`Promise`\<`CapabilityStateRecord`\>

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

### ownerDeleteSecret()

> **ownerDeleteSecret**(`input`): `Promise`\<`void`\>

Permanently deletes a secret from the vault.

#### Parameters

##### input

[`VaultDeleteSecretInput`](VaultDeleteSecretInput.md)

#### Returns

`Promise`\<`void`\>

***

### ownerExecuteCapabilityStateAndGrant()

> **ownerExecuteCapabilityStateAndGrant**(`input`): `Promise`\<`DispatchResult`\>

#### Parameters

##### input

[`VaultApproveCapabilityRequestInput`](VaultApproveCapabilityRequestInput.md)

#### Returns

`Promise`\<`DispatchResult`\>

***

### ownerExecuteCapabilityStateOnce()

> **ownerExecuteCapabilityStateOnce**(`input`): `Promise`\<`DispatchResult`\>

#### Parameters

##### input

[`VaultApproveCapabilityRequestInput`](VaultApproveCapabilityRequestInput.md)

#### Returns

`Promise`\<`DispatchResult`\>

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

### ownerGrantCapability()

> **ownerGrantCapability**(`input`): `Promise`\<`AgentCapability`\>

Grants a specific capability to an agent.

#### Parameters

##### input

[`OwnerGrantCapabilityInput`](../type-aliases/OwnerGrantCapabilityInput.md)

#### Returns

`Promise`\<`AgentCapability`\>

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

> **ownerListCapabilities**(`input?`): `Promise`\<readonly `AgentCapability`[]\>

Lists all active capabilities granted to agents.

#### Parameters

##### input?

[`VaultListCapabilitiesInput`](VaultListCapabilitiesInput.md)

#### Returns

`Promise`\<readonly `AgentCapability`[]\>

***

### ownerListCapabilityStates()

> **ownerListCapabilityStates**(`input?`): `Promise`\<readonly `CapabilityStateRecord`[]\>

#### Parameters

##### input?

`VaultListCapabilityStatesInput`

#### Returns

`Promise`\<readonly `CapabilityStateRecord`[]\>

***

### ownerListSecrets()

> **ownerListSecrets**(`input?`): `Promise`\<readonly `AgentVisibleSecretRecord`[]\>

#### Parameters

##### input?

[`VaultListSecretsInput`](VaultListSecretsInput.md)

#### Returns

`Promise`\<readonly `AgentVisibleSecretRecord`[]\>

***

### ownerOnCapabilityState()

> **ownerOnCapabilityState**(`callback`): () => `void`

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

### ownerRejectCapabilityState()

> **ownerRejectCapabilityState**(`requestId`): `Promise`\<`CapabilityStateRecord`\>

#### Parameters

##### requestId

`string`

#### Returns

`Promise`\<`CapabilityStateRecord`\>

***

### ownerRevokeCapability()

> **ownerRevokeCapability**(`input`): `Promise`\<`void`\>

Revokes a previously granted capability.

#### Parameters

##### input

[`VaultRevokeCapabilityInput`](VaultRevokeCapabilityInput.md)

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

### ownerStoreSecret()

> **ownerStoreSecret**(`input`): `Promise`\<`SecretRecord`\>

Securely stores a new secret in the vault.

#### Parameters

##### input

[`OwnerStoreSecretInput`](OwnerStoreSecretInput.md)

#### Returns

`Promise`\<`SecretRecord`\>

***

### ownerSubmitCapabilityRequest()

> **ownerSubmitCapabilityRequest**(`input`): `Promise`\<`CapabilityStateRecord`\>

#### Parameters

##### input

[`VaultSubmitCapabilityRequestInput`](VaultSubmitCapabilityRequestInput.md)

#### Returns

`Promise`\<`CapabilityStateRecord`\>

***

### ownerUpdateAgent()

> **ownerUpdateAgent**(`input`): `Promise`\<`AgentIdentityRecord`\>

#### Parameters

##### input

[`VaultUpdateAgentInput`](VaultUpdateAgentInput.md)

#### Returns

`Promise`\<`AgentIdentityRecord`\>

***

### ownerWriteSecret()

> **ownerWriteSecret**(`input`): `Promise`\<`SecretRecord`\>

Stores a manually provided secret in the vault.

#### Parameters

##### input

[`OwnerWriteSecretInput`](OwnerWriteSecretInput.md)

#### Returns

`Promise`\<`SecretRecord`\>
