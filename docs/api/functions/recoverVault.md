[**CBIO Node Runtime Agent API v1.71.0**](../README.md)

***

# Function: recoverVault()

## Call Signature

> **recoverVault**(`storage`, `options`): `Promise`\<[`RecoveredVault`](../interfaces/RecoveredVault.md)\>

Reopens an existing vault from storage.

### Parameters

#### storage

`string` \| [`IStorageProvider`](../interfaces/IStorageProvider.md)

Workspace storage where the vault was created.

#### options

[`RecoverVaultOptions`](../interfaces/RecoverVaultOptions.md)

Recovery options (must include `vault_id` and `password`).

### Returns

`Promise`\<[`RecoveredVault`](../interfaces/RecoveredVault.md)\>

A [RecoveredVault](../interfaces/RecoveredVault.md) instance.

### Example

```ts
const vault = await recoverVault({
  vault_id: 'vault_123',
  password: 'my-strong-password'
});
```

## Call Signature

> **recoverVault**(`options`): `Promise`\<[`RecoveredVault`](../interfaces/RecoveredVault.md)\>

Recovers an existing vault using the default workspace storage.

### Parameters

#### options

[`RecoverVaultOptions`](../interfaces/RecoverVaultOptions.md)

Recovery options including vault_id and password.

### Returns

`Promise`\<[`RecoveredVault`](../interfaces/RecoveredVault.md)\>
