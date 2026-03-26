[**CBIO Node Runtime Agent API v1.55.0**](../README.md)

***

# Function: createVault()

## Call Signature

> **createVault**(`storage`, `options`): `Promise`\<[`CreatedVault`](../interfaces/CreatedVault.md)\>

Creates and bootstraps a new persistent vault.

### Parameters

#### storage

`string` \| [`IStorageProvider`](../interfaces/IStorageProvider.md)

Workspace storage (or path string) where vaults are stored.

#### options

[`CreateVaultOptions`](../interfaces/CreateVaultOptions.md)

Configuration including password and metadata.

### Returns

`Promise`\<[`CreatedVault`](../interfaces/CreatedVault.md)\>

A [CreatedVault](../interfaces/CreatedVault.md) instance.

### Example

```ts
const vault = await createVault({
  password: 'my-strong-password',
  nickname: 'production-secrets'
});
```

## Call Signature

> **createVault**(`options`): `Promise`\<[`CreatedVault`](../interfaces/CreatedVault.md)\>

Creates a new vault using the default workspace storage.

### Parameters

#### options

[`CreateVaultOptions`](../interfaces/CreateVaultOptions.md)

Configuration for the new vault.

### Returns

`Promise`\<[`CreatedVault`](../interfaces/CreatedVault.md)\>
