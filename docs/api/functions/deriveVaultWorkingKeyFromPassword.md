[**CBIO Node Runtime Agent API v1.48.6**](../README.md)

***

# Function: deriveVaultWorkingKeyFromPassword()

> **deriveVaultWorkingKeyFromPassword**(`password`, `vaultId`): `string`

Derives a 256-bit working key from a user password and salt (vaultId).
Using scrypt for memory-hard key derivation to resist brute-force attacks.

## Parameters

### password

`string`

### vaultId

`string`

## Returns

`string`
