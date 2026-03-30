[**CBIO Node Runtime Agent API v1.74.0**](../README.md)

***

# Interface: AgentDispatchTransport

## Methods

### agentAuditTestPing()

> **agentAuditTestPing**(`request`): `Promise`\<[`AuditEntry`](AuditEntry.md)\>

#### Parameters

##### request

`AgentAuditTestPingRequest`

#### Returns

`Promise`\<[`AuditEntry`](AuditEntry.md)\>

***

### agentDispatch()

> **agentDispatch**(`request`): `Promise`\<[`DispatchResult`](DispatchResult.md)\>

#### Parameters

##### request

[`DispatchRequest`](DispatchRequest.md)

#### Returns

`Promise`\<[`DispatchResult`](DispatchResult.md)\>

***

### agentGetRequest()

> **agentGetRequest**(`request`): `Promise`\<[`AgentRequestRecord`](AgentRequestRecord.md)\>

#### Parameters

##### request

`AgentGetRequestRequest`

#### Returns

`Promise`\<[`AgentRequestRecord`](AgentRequestRecord.md)\>

***

### agentGetRuntimeManifest()

> **agentGetRuntimeManifest**(`request`): `Promise`\<[`AgentRuntimeManifest`](AgentRuntimeManifest.md)\>

#### Parameters

##### request

`AgentGetRuntimeManifestRequest`

#### Returns

`Promise`\<[`AgentRuntimeManifest`](AgentRuntimeManifest.md)\>

***

### agentListRequests()

> **agentListRequests**(`request`): `Promise`\<readonly [`AgentRequestRecord`](AgentRequestRecord.md)[]\>

#### Parameters

##### request

`AgentListRequestsRequest`

#### Returns

`Promise`\<readonly [`AgentRequestRecord`](AgentRequestRecord.md)[]\>

***

### agentListSecrets()

> **agentListSecrets**(`request`): `Promise`\<readonly [`SecretRecord`](SecretRecord.md)[]\>

#### Parameters

##### request

`AgentListSecretsRequest`

#### Returns

`Promise`\<readonly [`SecretRecord`](SecretRecord.md)[]\>
