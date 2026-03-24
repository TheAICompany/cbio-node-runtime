[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: OwnerIdentityRegistry

## Methods

### get()

> **get**(`vaultId`, `ownerId`): `Promise`\<[`OwnerIdentityRecord`](OwnerIdentityRecord.md) \| `null`\>

#### Parameters

##### vaultId

[`VaultId`](VaultId.md)

##### ownerId

`string`

#### Returns

`Promise`\<[`OwnerIdentityRecord`](OwnerIdentityRecord.md) \| `null`\>

***

### hasAny()

> **hasAny**(`vaultId`): `Promise`\<`boolean`\>

#### Parameters

##### vaultId

[`VaultId`](VaultId.md)

#### Returns

`Promise`\<`boolean`\>

***

### register()

> **register**(`identity`): `Promise`\<`void`\>

#### Parameters

##### identity

[`OwnerIdentityRecord`](OwnerIdentityRecord.md)

#### Returns

`Promise`\<`void`\>
