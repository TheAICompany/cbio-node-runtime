[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Interface: IssuerWriteSecretCommand

## Properties

### alias

> **alias**: `string`

***

### issuer

> **issuer**: [`VaultPrincipal`](VaultPrincipal.md) & `object`

#### Type Declaration

##### kind

> **kind**: `"trusted_issuer"`

***

### issuerSiteId

> **issuerSiteId**: `string`

***

### kind

> **kind**: `"issuer.write_secret"`

***

### plaintext

> **plaintext**: `string`

***

### requestedAt

> **requestedAt**: `string`

***

### targetBindings?

> `optional` **targetBindings?**: readonly [`VaultTargetBinding`](VaultTargetBinding.md)[]

***

### vaultId

> **vaultId**: [`VaultId`](VaultId.md)
