[**CBIO Node Runtime Agent API v1.63.3**](../README.md)

***

# Interface: AgentDispatchTransport

## Methods

### agentDispatch()

> **agentDispatch**(`request`): `Promise`\<`DispatchResult`\>

#### Parameters

##### request

`DispatchRequest`

#### Returns

`Promise`\<`DispatchResult`\>

***

### agentGetRequest()

> **agentGetRequest**(`request`): `Promise`\<`AgentRequestResult`\>

#### Parameters

##### request

`AgentGetRequestRequest`

#### Returns

`Promise`\<`AgentRequestResult`\>

***

### agentGetRuntimeManifest()

> **agentGetRuntimeManifest**(`request`): `Promise`\<`AgentRuntimeManifest`\>

#### Parameters

##### request

`AgentGetRuntimeManifestRequest`

#### Returns

`Promise`\<`AgentRuntimeManifest`\>

***

### agentListCapabilities()

> **agentListCapabilities**(`request`): `Promise`\<readonly `AgentGrantState`[]\>

#### Parameters

##### request

`AgentListCapabilitiesRequest`

#### Returns

`Promise`\<readonly `AgentGrantState`[]\>

***

### agentListRequests()

> **agentListRequests**(`request`): `Promise`\<readonly `AgentVisibleRequestRecord`[]\>

#### Parameters

##### request

`AgentListRequestsRequest`

#### Returns

`Promise`\<readonly `AgentVisibleRequestRecord`[]\>

***

### agentListSecrets()

> **agentListSecrets**(`request`): `Promise`\<readonly `AgentVisibleSecretRecord`[]\>

#### Parameters

##### request

`AgentListSecretsRequest`

#### Returns

`Promise`\<readonly `AgentVisibleSecretRecord`[]\>

***

### agentSubmitGrantRequest()

> **agentSubmitGrantRequest**(`request`): `Promise`\<`GrantStateRecord`\>

#### Parameters

##### request

`AgentSubmitGrantRequestCommand`

#### Returns

`Promise`\<`GrantStateRecord`\>
