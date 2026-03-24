[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Interface: OwnerWriteSecretCommand

## Properties

### alias

> **alias**: `string`

***

### kind

> **kind**: `"owner.write_secret"`

***

### owner

> **owner**: [`VaultPrincipal`](VaultPrincipal.md) & `object`

#### Type Declaration

##### kind

> **kind**: `"owner"`

***

### plaintext

> **plaintext**: `string`

***

### proof

> **proof**: [`OwnerProof`](OwnerProof.md)

***

### requestedAt

> **requestedAt**: `string`

***

### requestId

> **requestId**: `string`

***

### targetBindings?

> `optional` **targetBindings?**: readonly [`VaultTargetBinding`](VaultTargetBinding.md)[]

***

### vaultId

> **vaultId**: [`VaultId`](VaultId.md)
