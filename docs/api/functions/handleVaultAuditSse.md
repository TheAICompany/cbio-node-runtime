[**CBIO Node Runtime Agent API v1.70.1**](../README.md)

***

# Function: handleVaultAuditSse()

> **handleVaultAuditSse**(`service`, `options?`): `Response`

Creates an SSE response that streams owner-visible audit entries.
Host applications should authenticate owner access before exposing this helper remotely.

## Parameters

### service

[`VaultService`](../interfaces/VaultService.md)

The VaultService instance to subscribe against.

### options?

`VaultAuditSseOptions` = `{}`

Stream options such as replay cursor, filtering, and abort handling.

## Returns

`Response`

A streaming SSE Response that emits `audit_entry` events by default.
