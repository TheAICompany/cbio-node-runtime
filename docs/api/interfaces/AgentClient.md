[**CBIO Node Runtime Agent API v1.48.6**](../README.md)

***

# Interface: AgentClient

A client for agents to perform authorized operations (e.g., dispatch HTTP requests with secrets).
This client uses a delegated capability granted by the owner.

## Methods

### dispatch()

> **dispatch**(`intent`): `Promise`\<`DispatchResult`\>

Dispatches a signed request to a target using a vault secret.

#### Parameters

##### intent

[`AgentDispatchIntent`](AgentDispatchIntent.md)

The destination, method, and secret alias to use.

#### Returns

`Promise`\<`DispatchResult`\>

The result of the remote operation.

#### Example

```ts
const result = await agent.dispatch({
  targetUrl: 'https://api.example.com/data',
  method: 'POST',
  secretAlias: 'api-token',
  body: JSON.stringify({ key: 'value' })
});
```
