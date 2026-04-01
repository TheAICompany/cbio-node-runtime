[**CBIO Node Runtime Agent API v1.76.1**](../README.md)

***

# Function: handleVaultPendingDispatchSse()

> **handleVaultPendingDispatchSse**(`service`, `options?`): `Response`

Creates an SSE response that streams owner-visible pending dispatch events.
Host applications should authenticate owner access before exposing this helper remotely.

## Parameters

### service

[`VaultService`](../interfaces/VaultService.md)

The VaultService instance to subscribe against.

### options?

`VaultPendingDispatchSseOptions` = `{}`

Stream options such as replay cursor and abort handling.

## Returns

`Response`

A streaming SSE Response that emits `pending_dispatch` events.
