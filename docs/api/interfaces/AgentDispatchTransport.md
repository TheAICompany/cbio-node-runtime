[**CBIO Node Runtime Agent API v1.50.0**](../README.md)

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

### agentListCapabilities()

> **agentListCapabilities**(`request`): `Promise`\<readonly `AgentCapability`[]\>

#### Parameters

##### request

`AgentListCapabilitiesRequest`

#### Returns

`Promise`\<readonly `AgentCapability`[]\>

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

> **agentSubmitCapabilityRequest**(`request`): `Promise`\<`PendingCapabilityRequestRecord`\>

#### Parameters

##### request

`AgentSubmitCapabilityRequestCommand`

#### Returns

`Promise`\<`PendingCapabilityRequestRecord`\>
