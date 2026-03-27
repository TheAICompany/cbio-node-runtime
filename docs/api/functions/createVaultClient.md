[**CBIO Node Runtime Agent API v1.63.3**](../README.md)

***

# Function: createVaultClient()

> **createVaultClient**(`options`): [`VaultClient`](../interfaces/VaultClient.md)

Creates a [VaultClient](../interfaces/VaultClient.md) instance for a specific vault owner.

## Parameters

### options

[`CreateVaultClientOptions`](../interfaces/CreateVaultClientOptions.md)

Configuration including optional owner identity and the vault service.

## Returns

[`VaultClient`](../interfaces/VaultClient.md)

An initialized [VaultClient](../interfaces/VaultClient.md).

## Example

```ts
const client = createVaultClient({
  ownerIdentity,
  vault
});
```
