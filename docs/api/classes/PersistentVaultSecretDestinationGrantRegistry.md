[**CBIO Node Runtime Agent API v1.63.8**](../README.md)

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

> **delete**(`vault_id`, `secret_alias`, `site_id`): `Promise`\<`void`\>

#### Parameters

##### vault\_id

[`VaultId`](../interfaces/VaultId.md)

##### secret\_alias

`string`

##### site\_id

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SecretDestinationGrantRegistry.delete`

***

### get()

> **get**(`vault_id`, `secret_alias`, `site_id`): `Promise`\<[`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md) \| `null`\>

#### Parameters

##### vault\_id

[`VaultId`](../interfaces/VaultId.md)

##### secret\_alias

`string`

##### site\_id

`string`

#### Returns

`Promise`\<[`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md) \| `null`\>

#### Implementation of

`SecretDestinationGrantRegistry.get`

***

### list()

> **list**(`vault_id`, `secret_alias?`): `Promise`\<readonly [`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)[]\>

#### Parameters

##### vault\_id

[`VaultId`](../interfaces/VaultId.md)

##### secret\_alias?

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
