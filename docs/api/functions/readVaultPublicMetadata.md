[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Function: readVaultPublicMetadata()

> **readVaultPublicMetadata**(`storage`, `vaultId`): `Promise`\<`Record`\<`string`, `any`\>\>

Reads the 'public' metadata of a vault. Requires vaultId but no private key.

## Parameters

### storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

### vaultId

`string`

## Returns

`Promise`\<`Record`\<`string`, `any`\>\>
