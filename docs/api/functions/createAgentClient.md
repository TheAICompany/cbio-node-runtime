[**CBIO Node Runtime Agent API v1.56.0**](../README.md)

***

# Function: createAgentClient()

> **createAgentClient**(`options`): [`AgentClient`](../interfaces/AgentClient.md)

Creates an [AgentClient](../interfaces/AgentClient.md) for a delegated identity.

## Parameters

### options

[`CreateAgentClientOptions`](../interfaces/CreateAgentClientOptions.md)

Configuration including agent identity, capability, and transport.

## Returns

[`AgentClient`](../interfaces/AgentClient.md)

An initialized [AgentClient](../interfaces/AgentClient.md).

## Example

```ts
const agent = createAgentClient({
  agentIdentity,
  capability,
  vault
});
```
