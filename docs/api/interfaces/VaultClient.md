[**CBIO Node Runtime Agent API v1.50.0**](../README.md)

***

# Interface: VaultClient

A client for vault owners to manage secrets, agents, and capabilities.
In Sovereign Vault model, administrative actions are implicitly authorized by the working key.

## Methods

### ownerApproveCapabilityRequest()

> **ownerApproveCapabilityRequest**(`input`): `Promise`\<`AgentCapability`\>

#### Parameters

##### input

[`VaultApproveCapabilityRequestInput`](VaultApproveCapabilityRequestInput.md)

#### Returns

`Promise`\<`AgentCapability`\>

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

### ownerDefineSecretTargets()

> **ownerDefineSecretTargets**(`input`): `Promise`\<`SecretRecord`\>

Refines the allowed targets for an existing secret.

#### Parameters

##### input

[`OwnerDefineSecretTargetsInput`](OwnerDefineSecretTargetsInput.md)

#### Returns

`Promise`\<`SecretRecord`\>

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

> **ownerGrantCapability**(`input`): `Promise`\<`void`\>

Grants a specific capability to an agent.

#### Parameters

##### input

[`VaultGrantCapabilityInput`](VaultGrantCapabilityInput.md)

#### Returns

`Promise`\<`void`\>

***

### ownerImportAgent()

> **ownerImportAgent**(`input`): `Promise`\<[`OwnerAgentProvisionResult`](OwnerAgentProvisionResult.md)\>

#### Parameters

##### input

[`VaultImportAgentInput`](VaultImportAgentInput.md)

#### Returns

`Promise`\<[`OwnerAgentProvisionResult`](OwnerAgentProvisionResult.md)\>

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

### ownerListPendingCapabilityRequests()

> **ownerListPendingCapabilityRequests**(): `Promise`\<readonly `PendingCapabilityRequestRecord`[]\>

#### Returns

`Promise`\<readonly `PendingCapabilityRequestRecord`[]\>

***

### ownerListSecrets()

> **ownerListSecrets**(`input?`): `Promise`\<readonly `AgentVisibleSecretRecord`[]\>

#### Parameters

##### input?

[`VaultListSecretsInput`](VaultListSecretsInput.md)

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

### ownerReadAudit()

> **ownerReadAudit**(`query?`): `Promise`\<readonly `AuditEntry`[]\>

Reads the tamper-evident audit log for the vault.

#### Parameters

##### query?

[`VaultAuditQueryInput`](VaultAuditQueryInput.md)

#### Returns

`Promise`\<readonly `AuditEntry`[]\>

***

### ownerRegisterFlow()

> **ownerRegisterFlow**(`input`): `Promise`\<`void`\>

Registers a custom HTTP flow for complex secret usage.

#### Parameters

##### input

[`VaultRegisterFlowInput`](VaultRegisterFlowInput.md)

#### Returns

`Promise`\<`void`\>

***

### ownerRejectCapabilityRequest()

> **ownerRejectCapabilityRequest**(`requestId`): `Promise`\<`void`\>

#### Parameters

##### requestId

`string`

#### Returns

`Promise`\<`void`\>

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

> **ownerSubmitCapabilityRequest**(`input`): `Promise`\<`PendingCapabilityRequestRecord`\>

#### Parameters

##### input

[`VaultSubmitCapabilityRequestInput`](VaultSubmitCapabilityRequestInput.md)

#### Returns

`Promise`\<`PendingCapabilityRequestRecord`\>

***

### ownerWriteSecret()

> **ownerWriteSecret**(`input`): `Promise`\<`SecretRecord`\>

Atomic operation to store a secret and define its targets in one step.

#### Parameters

##### input

[`OwnerWriteSecretInput`](OwnerWriteSecretInput.md)

#### Returns

`Promise`\<`SecretRecord`\>
