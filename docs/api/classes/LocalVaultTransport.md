[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: LocalVaultTransport

## Implements

- [`AgentDispatchTransport`](../interfaces/AgentDispatchTransport.md)

## Constructors

### Constructor

> **new LocalVaultTransport**(`_vault`): `LocalVaultTransport`

#### Parameters

##### \_vault

[`VaultService`](../interfaces/VaultService.md)

#### Returns

`LocalVaultTransport`

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
