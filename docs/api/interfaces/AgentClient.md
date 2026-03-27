[**CBIO Node Runtime Agent API v1.57.0**](../README.md)

***

# Interface: AgentClient

A client for agents to perform authorized operations (e.g., dispatch HTTP requests with secrets).
This client uses a delegated capability granted by the owner.

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

### agentIntrospect()

> **agentIntrospect**(): `Promise`\<`AgentRuntimeManifest`\>

Introspects the current runtime environment, providing identity, capabilities, and a toolbox manifest.
Equivalent to '--help' or 'llms.txt' for the agent.

#### Returns

`Promise`\<`AgentRuntimeManifest`\>

***

### agentListCapabilities()

> **agentListCapabilities**(): `Promise`\<readonly `AgentCapabilityState`[]\>

#### Returns

`Promise`\<readonly `AgentCapabilityState`[]\>

***

### agentListSecrets()

> **agentListSecrets**(): `Promise`\<readonly `AgentVisibleSecretRecord`[]\>

#### Returns

`Promise`\<readonly `AgentVisibleSecretRecord`[]\>

***

### agentSubmitCapabilityRequest()

> **agentSubmitCapabilityRequest**(`input`): `Promise`\<`CapabilityStateRecord`\>

#### Parameters

##### input

[`AgentSubmitCapabilityRequestInput`](AgentSubmitCapabilityRequestInput.md)

#### Returns

`Promise`\<`CapabilityStateRecord`\>
