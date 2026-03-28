[**CBIO Node Runtime Agent API v1.63.3**](../README.md)

***

# Interface: AgentClient

A client for agents to perform authorized operations (e.g., dispatch HTTP requests with secrets).
This client uses a delegated grant granted by the owner.
Agents can use secrets and request broader access, but they do not directly manage
the secret lifecycle inside the vault. Newly obtained credentials are persisted only
through owner actions or owner-configured vault flows that explicitly capture them.

## Methods

### agentDispatch()

> **agentDispatch**(`intent`): `Promise`\<`DispatchResult`\>

Dispatches a session-token-authenticated request to a target using a vault secret.

#### Parameters

##### intent

[`AgentDispatchIntent`](AgentDispatchIntent.md)

The destination, method, and secret alias to use.

#### Returns

`Promise`\<`DispatchResult`\>

The result of the remote operation.

#### Example

```ts
const result = await agent.agentDispatch({
  targetUrl: 'https://api.example.com/data',
  method: 'POST',
  secretAlias: 'api-token',
  body: JSON.stringify({ key: 'value' })
});
```

***

### agentGetRequest()

> **agentGetRequest**(`requestId`): `Promise`\<`AgentRequestResult`\>

#### Parameters

##### requestId

`string`

#### Returns

`Promise`\<`AgentRequestResult`\>

***

### agentIntrospect()

> **agentIntrospect**(): `Promise`\<`AgentRuntimeManifest`\>

Introspects the current runtime environment, providing identity, capabilities, and a toolbox manifest.
Equivalent to '--help' or 'llms.txt' for the agent.
This is the primary place where an agent should learn its operational boundary:
it can use existing secrets and request more permission, but it cannot directly
create, update, or remove secrets in the vault.

#### Returns

`Promise`\<`AgentRuntimeManifest`\>

***

### agentListCapabilities()

> **agentListCapabilities**(): `Promise`\<readonly `AgentGrantState`[]\>

#### Returns

`Promise`\<readonly `AgentGrantState`[]\>

***

### agentListRequests()

> **agentListRequests**(): `Promise`\<readonly `AgentVisibleRequestRecord`[]\>

#### Returns

`Promise`\<readonly `AgentVisibleRequestRecord`[]\>

***

### agentListSecrets()

> **agentListSecrets**(): `Promise`\<readonly `AgentVisibleSecretRecord`[]\>

#### Returns

`Promise`\<readonly `AgentVisibleSecretRecord`[]\>

***

### agentSubmitGrantRequest()

> **agentSubmitGrantRequest**(`input`): `Promise`\<`GrantStateRecord`\>

#### Parameters

##### input

[`AgentSubmitGrantRequestInput`](AgentSubmitGrantRequestInput.md)

#### Returns

`Promise`\<`GrantStateRecord`\>
