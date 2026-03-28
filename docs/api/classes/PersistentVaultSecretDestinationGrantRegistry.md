[**CBIO Node Runtime Agent API v1.63.5**](../README.md)

***

# Class: PersistentVaultSecretDestinationGrantRegistry

## Implements

- `SecretDestinationGrantRegistry`

## Constructors

### Constructor

> **new PersistentVaultSecretDestinationGrantRegistry**(`baseDir`): `FileSecretDestinationGrantRegistry`

#### Parameters

##### baseDir

`string`

#### Returns

`FileSecretDestinationGrantRegistry`

## Methods

### delete()

> **delete**(`vaultId`, `secretAlias`, `domain`): `Promise`\<`void`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### secretAlias

`string`

##### domain

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SecretDestinationGrantRegistry.delete`

***

### get()

> **get**(`vaultId`, `secretAlias`, `domain`): `Promise`\<[`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### secretAlias

`string`

##### domain

`string`

#### Returns

`Promise`\<[`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md) \| `null`\>

#### Implementation of

`SecretDestinationGrantRegistry.get`

***

### list()

> **list**(`vaultId`, `secretAlias?`): `Promise`\<readonly [`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)[]\>

#### Parameters

##### vaultId

[`VaultId`](../interfaces/VaultId.md)

##### secretAlias?

`string`

#### Returns

`Promise`\<readonly [`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)[]\>

#### Implementation of

`SecretDestinationGrantRegistry.list`

***

### upsert()

> **upsert**(`grant`): `Promise`\<`void`\>

#### Parameters

##### grant

[`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SecretDestinationGrantRegistry.upsert`
