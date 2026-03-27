[**CBIO Node Runtime Agent API v1.63.2**](../README.md)

***

# Function: handleVaultHttpDispatch()

> **handleVaultHttpDispatch**(`service`, `body`): `Promise`\<`VaultAgentDispatchResponse` \| `VaultAgentDispatchErrorResponse`\>

Standard server-side helper to handle a vault agent dispatch request from an HTTP body.
This can be used in any HTTP server framework (Express, Fastify, etc.).

## Parameters

### service

`VaultService`

The VaultService instance to handle the request.

### body

`unknown`

The parsed JSON body of the incoming HTTP request.

## Returns

`Promise`\<`VaultAgentDispatchResponse` \| `VaultAgentDispatchErrorResponse`\>

A JSON-serializable response object.
