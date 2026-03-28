[**CBIO Node Runtime Agent API v1.64.0**](../README.md)

***

# Function: deriveVaultWorkingKeyFromPassword()

> **deriveVaultWorkingKeyFromPassword**(`password`, `vault_id`): `string`

Derives a 256-bit working key from a user password and salt (vault_id).
Using scrypt for memory-hard key derivation to resist brute-force attacks.

## Parameters

### password

`string`

### vault\_id

`string`

## Returns

`string`
