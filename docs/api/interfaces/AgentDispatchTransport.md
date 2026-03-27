[**CBIO Node Runtime Agent API v1.57.0**](../README.md)

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

### agentGetRuntimeManifest()

> **agentGetRuntimeManifest**(`request`): `Promise`\<`AgentRuntimeManifest`\>

#### Parameters

##### request

`AgentGetRuntimeManifestRequest`

#### Returns

`Promise`\<`AgentRuntimeManifest`\>

***

### agentListCapabilities()

> **agentListCapabilities**(`request`): `Promise`\<readonly `AgentCapabilityState`[]\>

#### Parameters

##### request

`AgentListCapabilitiesRequest`

#### Returns

`Promise`\<readonly `AgentCapabilityState`[]\>

***

### agentListSecrets()

> **agentListSecrets**(`request`): `Promise`\<readonly `AgentVisibleSecretRecord`[]\>

#### Parameters

##### request

`AgentListSecretsRequest`

#### Returns

`Promise`\<readonly `AgentVisibleSecretRecord`[]\>

***

### agentSubmitCapabilityRequest()

> **agentSubmitCapabilityRequest**(`request`): `Promise`\<`CapabilityStateRecord`\>

#### Parameters

##### request

`AgentSubmitCapabilityRequestCommand`

#### Returns

`Promise`\<`CapabilityStateRecord`\>
