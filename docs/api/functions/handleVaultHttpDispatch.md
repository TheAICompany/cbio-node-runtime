[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Function: handleVaultHttpDispatch()

> **handleVaultHttpDispatch**(`service`, `body`): `Promise`\<[`VaultAgentDispatchResponse`](../interfaces/VaultAgentDispatchResponse.md) \| [`VaultAgentDispatchErrorResponse`](../interfaces/VaultAgentDispatchErrorResponse.md)\>

Standard server-side helper to handle a vault agent dispatch request from an HTTP body.
This can be used in any HTTP server framework (Express, Fastify, etc.).

## Parameters

### service

[`VaultService`](../interfaces/VaultService.md)

The VaultService instance to handle the request.

### body

`unknown`

The parsed JSON body of the incoming HTTP request.

## Returns

`Promise`\<[`VaultAgentDispatchResponse`](../interfaces/VaultAgentDispatchResponse.md) \| [`VaultAgentDispatchErrorResponse`](../interfaces/VaultAgentDispatchErrorResponse.md)\>

A JSON-serializable response object.
