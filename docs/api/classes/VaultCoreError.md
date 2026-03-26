[**CBIO Node Runtime Agent API v1.56.0**](../README.md)

***

# Class: VaultCoreError

## Extends

- `Error`

## Constructors

### Constructor

> **new VaultCoreError**(`message`, `code`): `VaultCoreError`

#### Parameters

##### message

`string`

##### code

`"VAULT_SECRET_NOT_FOUND"` \| `"VAULT_WRITE_DENIED"` \| `"VAULT_READ_DENIED"` \| `"VAULT_IDENTITY_DENIED"` \| `"VAULT_DISPATCH_DENIED"` \| `"VAULT_AUDIT_DENIED"` \| `"VAULT_AUDIT_FAILED"` \| `"VAULT_REQUEST_NOT_FOUND"` \| `"VAULT_AGENT_NOT_FOUND"` \| `"VAULT_CAPABILITY_NOT_FOUND"`

#### Returns

`VaultCoreError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"VAULT_SECRET_NOT_FOUND"` \| `"VAULT_WRITE_DENIED"` \| `"VAULT_READ_DENIED"` \| `"VAULT_IDENTITY_DENIED"` \| `"VAULT_DISPATCH_DENIED"` \| `"VAULT_AUDIT_DENIED"` \| `"VAULT_AUDIT_FAILED"` \| `"VAULT_REQUEST_NOT_FOUND"` \| `"VAULT_AGENT_NOT_FOUND"` \| `"VAULT_CAPABILITY_NOT_FOUND"`
