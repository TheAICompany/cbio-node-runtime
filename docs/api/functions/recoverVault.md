[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

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

Recovery options (must include `vaultId` and `ownerIdentity`).

### Returns

`Promise`\<[`RecoveredVault`](../interfaces/RecoveredVault.md)\>

A [RecoveredVault](../interfaces/RecoveredVault.md) instance.

### Example

```ts
const vault = await recoverVault({
  vaultId: 'vault_123',
  ownerIdentity
});
```

## Call Signature

> **recoverVault**(`options`): `Promise`\<[`RecoveredVault`](../interfaces/RecoveredVault.md)\>

Recovers an existing vault using the default workspace storage.

### Parameters

#### options

[`RecoverVaultOptions`](../interfaces/RecoverVaultOptions.md)

Recovery options including vaultId and owner identity.

### Returns

`Promise`\<[`RecoveredVault`](../interfaces/RecoveredVault.md)\>
