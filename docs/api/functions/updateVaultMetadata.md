[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Function: updateVaultMetadata()

> **updateVaultMetadata**(`vault`, `options`): `Promise`\<`void`\>

Updates the metadata (like nickname) of an existing vault.

## Parameters

### vault

[`CreatedVault`](../interfaces/CreatedVault.md) \| [`RecoveredVault`](../interfaces/RecoveredVault.md)

### options

#### nickname?

`string`

#### ownerIdentity

`CreatedIdentity`

#### publicMetadata?

`Record`\<`string`, `any`\>

## Returns

`Promise`\<`void`\>
