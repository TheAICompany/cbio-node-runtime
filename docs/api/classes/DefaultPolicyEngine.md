[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: DefaultPolicyEngine

## Implements

- [`PolicyEngine`](../interfaces/PolicyEngine.md)

## Constructors

### Constructor

> **new DefaultPolicyEngine**(`_options?`): `DefaultPolicyEngine`

#### Parameters

##### \_options?

[`DefaultPolicyEngineOptions`](../interfaces/DefaultPolicyEngineOptions.md) = `{}`

#### Returns

`DefaultPolicyEngine`

## Methods

### authorizeDefineSecretTargets()

> **authorizeDefineSecretTargets**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`OwnerDefineSecretTargetsCommand`](../interfaces/OwnerDefineSecretTargetsCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`PolicyEngine`](../interfaces/PolicyEngine.md).[`authorizeDefineSecretTargets`](../interfaces/PolicyEngine.md#authorizedefinesecrettargets)

***

### authorizeDispatch()

> **authorizeDispatch**(`request`, `record?`): `Promise`\<`void`\>

#### Parameters

##### request

[`DispatchRequest`](../interfaces/DispatchRequest.md)

##### record?

[`SecretRecord`](../interfaces/SecretRecord.md) \| `null`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`PolicyEngine`](../interfaces/PolicyEngine.md).[`authorizeDispatch`](../interfaces/PolicyEngine.md#authorizedispatch)

***

### authorizeWrite()

> **authorizeWrite**(`command`): `Promise`\<`void`\>

#### Parameters

##### command

[`VaultWriteSecretCommand`](../type-aliases/VaultWriteSecretCommand.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`PolicyEngine`](../interfaces/PolicyEngine.md).[`authorizeWrite`](../interfaces/PolicyEngine.md#authorizewrite)

***

### revokeCapability()

> **revokeCapability**(`vaultId`, `agentId`, `capabilityId`): `Promise`\<`number`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### agentId

`string`

##### capabilityId

`string`

#### Returns

`Promise`\<`number`\>

#### Implementation of

[`PolicyEngine`](../interfaces/PolicyEngine.md).[`revokeCapability`](../interfaces/PolicyEngine.md#revokecapability)
