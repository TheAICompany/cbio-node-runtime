[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: VaultClient

A client for vault owners to manage secrets, agents, and capabilities.
This client requires an owner signature for every operation.

## Methods

### defineSecretTargets()

> **defineSecretTargets**(`input`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

Refines the allowed targets for an existing secret.

#### Parameters

##### input

[`OwnerDefineSecretTargetsInput`](OwnerDefineSecretTargetsInput.md)

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>

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

> **exportSecret**(`input`): `Promise`\<[`OwnerSecretExport`](OwnerSecretExport.md)\>

Exports a secret's plaintext (requires owner permission).

#### Parameters

##### input

[`VaultExportSecretInput`](VaultExportSecretInput.md)

#### Returns

`Promise`\<[`OwnerSecretExport`](OwnerSecretExport.md)\>

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

> **listAgents**(`input?`): `Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

Lists all agents registered in the vault.

#### Parameters

##### input?

[`VaultListAgentsInput`](VaultListAgentsInput.md)

#### Returns

`Promise`\<readonly [`AgentIdentityRecord`](AgentIdentityRecord.md)[]\>

***

### listCapabilities()

> **listCapabilities**(`input?`): `Promise`\<readonly [`AgentCapability`](AgentCapability.md)[]\>

Lists all active capabilities granted to agents.

#### Parameters

##### input?

[`VaultListCapabilitiesInput`](VaultListCapabilitiesInput.md)

#### Returns

`Promise`\<readonly [`AgentCapability`](AgentCapability.md)[]\>

***

### readAudit()

> **readAudit**(`query?`): `Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>

Reads the tamper-evident audit log for the vault.

#### Parameters

##### query?

[`VaultAuditQueryInput`](VaultAuditQueryInput.md)

#### Returns

`Promise`\<readonly [`AuditEntry`](AuditEntry.md)[]\>

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

> **storeSecret**(`input`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

Securely stores a new secret in the vault.

#### Parameters

##### input

[`OwnerStoreSecretInput`](OwnerStoreSecretInput.md)

The secret alias and plaintext.

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>

The record of the stored secret.

#### Example

```ts
await client.storeSecret({ alias: 'db-pass', plaintext: 's3cret' });
```

***

### writeSecret()

> **writeSecret**(`input`): `Promise`\<[`SecretRecord`](SecretRecord.md)\>

Atomic operation to store a secret and define its targets in one step.

#### Parameters

##### input

[`OwnerWriteSecretInput`](OwnerWriteSecretInput.md)

#### Returns

`Promise`\<[`SecretRecord`](SecretRecord.md)\>
