[**CBIO Node Runtime Agent API v1.46.0**](../README.md)

***

# Interface: VaultClient

A client for vault owners to manage secrets, agents, and capabilities.
In Sovereign Vault model, administrative actions are implicitly authorized by the working key.

## Methods

### defineSecretTargets()

> **defineSecretTargets**(`input`): `Promise`\<`SecretRecord`\>

Refines the allowed targets for an existing secret.

#### Parameters

##### input

[`OwnerDefineSecretTargetsInput`](OwnerDefineSecretTargetsInput.md)

#### Returns

`Promise`\<`SecretRecord`\>

***

### deleteSecret()

> **deleteSecret**(`input`): `Promise`\<`void`\>

Permanently deletes a secret from the vault.

#### Parameters

##### input

[`VaultDeleteSecretInput`](VaultDeleteSecretInput.md)

#### Returns

`Promise`\<`void`\>

***

### exportSecret()

> **exportSecret**(`input`): `Promise`\<`OwnerSecretExport`\>

Exports a secret's plaintext.

#### Parameters

##### input

[`VaultExportSecretInput`](VaultExportSecretInput.md)

#### Returns

`Promise`\<`OwnerSecretExport`\>

***

### grantCapability()

> **grantCapability**(`input`): `Promise`\<`void`\>

Grants a specific capability to an agent.

#### Parameters

##### input

[`VaultGrantCapabilityInput`](VaultGrantCapabilityInput.md)

#### Returns

`Promise`\<`void`\>

***

### listAgents()

> **listAgents**(`input?`): `Promise`\<readonly `AgentIdentityRecord`[]\>

Lists all agents registered in the vault.

#### Parameters

##### input?

[`VaultListAgentsInput`](VaultListAgentsInput.md)

#### Returns

`Promise`\<readonly `AgentIdentityRecord`[]\>

***

### listCapabilities()

> **listCapabilities**(`input?`): `Promise`\<readonly `AgentCapability`[]\>

Lists all active capabilities granted to agents.

#### Parameters

##### input?

[`VaultListCapabilitiesInput`](VaultListCapabilitiesInput.md)

#### Returns

`Promise`\<readonly `AgentCapability`[]\>

***

### readAudit()

> **readAudit**(`query?`): `Promise`\<readonly `AuditEntry`[]\>

Reads the tamper-evident audit log for the vault.

#### Parameters

##### query?

[`VaultAuditQueryInput`](VaultAuditQueryInput.md)

#### Returns

`Promise`\<readonly `AuditEntry`[]\>

***

### registerAgent()

> **registerAgent**(`input`): `Promise`\<`void`\>

Registers a new agent identity within the vault.

#### Parameters

##### input

[`VaultRegisterAgentInput`](VaultRegisterAgentInput.md)

#### Returns

`Promise`\<`void`\>

***

### registerFlow()

> **registerFlow**(`input`): `Promise`\<`void`\>

Registers a custom HTTP flow for complex secret usage.

#### Parameters

##### input

[`VaultRegisterFlowInput`](VaultRegisterFlowInput.md)

#### Returns

`Promise`\<`void`\>

***

### revokeCapability()

> **revokeCapability**(`input`): `Promise`\<`void`\>

Revokes a previously granted capability.

#### Parameters

##### input

[`VaultRevokeCapabilityInput`](VaultRevokeCapabilityInput.md)

#### Returns

`Promise`\<`void`\>

***

### storeSecret()

> **storeSecret**(`input`): `Promise`\<`SecretRecord`\>

Securely stores a new secret in the vault.

#### Parameters

##### input

[`OwnerStoreSecretInput`](OwnerStoreSecretInput.md)

#### Returns

`Promise`\<`SecretRecord`\>

***

### writeSecret()

> **writeSecret**(`input`): `Promise`\<`SecretRecord`\>

Atomic operation to store a secret and define its targets in one step.

#### Parameters

##### input

[`OwnerWriteSecretInput`](OwnerWriteSecretInput.md)

#### Returns

`Promise`\<`SecretRecord`\>
