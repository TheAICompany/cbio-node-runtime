[**CBIO Node Runtime Agent API v1.63.3**](../README.md)

***

# Function: createOwnerClient()

> **createOwnerClient**(`options`): [`OwnerClient`](../interfaces/OwnerClient.md)

Creates a [OwnerClient](../interfaces/OwnerClient.md) instance for a specific vault owner.

## Parameters

### options

[`CreateOwnerClientOptions`](../interfaces/CreateOwnerClientOptions.md)

Configuration including optional owner identity and the vault service.

## Returns

[`OwnerClient`](../interfaces/OwnerClient.md)

An initialized [OwnerClient](../interfaces/OwnerClient.md).

## Example

```ts
const client = createOwnerClient({
  ownerIdentity,
  vault
});
```
