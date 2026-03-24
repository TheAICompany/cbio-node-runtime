[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: AgentDispatchHttpTransport

Remote transport for AgentClient that communicates over HTTP.
This allows the Agent (LLM) to reside in a separate process from the Vault Core.

## Implements

- [`AgentDispatchTransport`](../interfaces/AgentDispatchTransport.md)

## Constructors

### Constructor

> **new AgentDispatchHttpTransport**(`_url`, `_fetchImpl?`): `AgentDispatchHttpTransport`

#### Parameters

##### \_url

`string`

##### \_fetchImpl?

\{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

#### Returns

`AgentDispatchHttpTransport`

## Methods

### dispatch()

> **dispatch**(`request`): `Promise`\<[`DispatchResult`](../interfaces/DispatchResult.md)\>

#### Parameters

##### request

[`DispatchRequest`](../interfaces/DispatchRequest.md)

#### Returns

`Promise`\<[`DispatchResult`](../interfaces/DispatchResult.md)\>

#### Implementation of

[`AgentDispatchTransport`](../interfaces/AgentDispatchTransport.md).[`dispatch`](../interfaces/AgentDispatchTransport.md#dispatch)
