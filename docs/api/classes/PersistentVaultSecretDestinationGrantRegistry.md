[**CBIO Node Runtime Agent API v1.73.0**](../README.md)

***

# Class: PersistentVaultSecretDestinationGrantRegistry

## Implements

- `SecretDestinationGrantRegistry`

## Constructors

### Constructor

> **new PersistentVaultSecretDestinationGrantRegistry**(`db`): `SqliteSecretDestinationGrantRegistry`

#### Parameters

##### db

`Database`

#### Returns

`SqliteSecretDestinationGrantRegistry`

## Methods

### delete()

> **delete**(`vault_id`, `secret_id`, `site_id`): `Promise`\<`void`\>

#### Parameters

##### vault\_id

`string`

##### secret\_id

`string`

##### site\_id

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SecretDestinationGrantRegistry.delete`

***

### get()

> **get**(`vault_id`, `secret_id`, `site_id`): `Promise`\<[`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md) \| `null`\>

#### Parameters

##### vault\_id

`string`

##### secret\_id

`string`

##### site\_id

`string`

#### Returns

`Promise`\<[`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md) \| `null`\>

#### Implementation of

`SecretDestinationGrantRegistry.get`

***

### list()

> **list**(`vault_id`, `secret_id?`): `Promise`\<readonly [`SecretDestinationGrant`](../interfaces/SecretDestinationGrant.md)[]\>

#### Parameters

##### vault\_id

`string`

##### secret\_id?

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
