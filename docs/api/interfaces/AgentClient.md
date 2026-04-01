[**CBIO Node Runtime Agent API v1.76.1**](../README.md)

***

# Interface: AgentClient

A client for agents to perform authorized operations (e.g., dispatch HTTP requests with secrets).
This client uses a session token managed by the owner.
Agents can use secrets and request broader access, but they do not directly manage
the secret lifecycle inside the vault.

## Methods

### agentAuditTestPing()

> **agentAuditTestPing**(`input?`): `Promise`\<[`AuditEntry`](AuditEntry.md)\>

Emits a deterministic audit test event for validating audit subscriptions.

#### Parameters

##### input?

[`AgentAuditTestPingInput`](AgentAuditTestPingInput.md)

#### Returns

`Promise`\<[`AuditEntry`](AuditEntry.md)\>

***

### agentDispatch()

> **agentDispatch**(`intent`): `Promise`\<[`DispatchResult`](DispatchResult.md)\>

Dispatches a session-token-authenticated request to a target using a vault secret.
If the grant is missing, it will return an AWAITING_APPROVAL status.

#### Parameters

##### intent

[`AgentDispatchIntent`](AgentDispatchIntent.md)

#### Returns

`Promise`\<[`DispatchResult`](DispatchResult.md)\>

***

### agentGetRequest()

> **agentGetRequest**(`request_id`): `Promise`\<[`AgentRequestRecord`](AgentRequestRecord.md)\>

Get details of a specific request.

#### Parameters

##### request\_id

`string`

#### Returns

`Promise`\<[`AgentRequestRecord`](AgentRequestRecord.md)\>

***

### agentIntrospect()

> **agentIntrospect**(): `Promise`\<[`AgentRuntimeManifest`](AgentRuntimeManifest.md)\>

Introspects the current runtime environment, providing identity, grants, and a toolbox manifest.

#### Returns

`Promise`\<[`AgentRuntimeManifest`](AgentRuntimeManifest.md)\>

***

### agentListRequests()

> **agentListRequests**(): `Promise`\<readonly [`AgentRequestRecord`](AgentRequestRecord.md)[]\>

List previous requests sent by this agent.

#### Returns

`Promise`\<readonly [`AgentRequestRecord`](AgentRequestRecord.md)[]\>

***

### agentListSecrets()

> **agentListSecrets**(): `Promise`\<readonly [`SecretRecord`](SecretRecord.md)[]\>

List secrets the agent can see, including whether they are granted or not.

#### Returns

`Promise`\<readonly [`SecretRecord`](SecretRecord.md)[]\>
