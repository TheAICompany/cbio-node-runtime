[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Interface: PolicyEngine

## Methods

### authorizeDefineSecretTargets()

> **authorizeDefineSecretTargets**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerDefineSecretTargetsCommand`](OwnerDefineSecretTargetsCommand.md)

#### Returns

`Promise`\<`void`\>

***

### authorizeDispatch()

> **authorizeDispatch**(`request`, `record?`): `Promise`\<`void`\>

#### Parameters

##### request

[`DispatchRequest`](DispatchRequest.md)

##### record?

[`SecretRecord`](SecretRecord.md) \| `null`

#### Returns

`Promise`\<`void`\>

***

### authorizeWrite()

> **authorizeWrite**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`VaultWriteSecretCommand`](../type-aliases/VaultWriteSecretCommand.md)

#### Returns

`Promise`\<`void`\>

***

### revokeCapability()

> **revokeCapability**(`vaultId`, `agentId`, `capabilityId`): `Promise`\<`number`\>

#### Parameters

##### vaultId

[`VaultId`](VaultId.md)

##### agentId

`string`

##### capabilityId

`string`

#### Returns

`Promise`\<`number`\>
