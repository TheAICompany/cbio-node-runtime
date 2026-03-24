[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: HttpDispatchExecutor

## Implements

- [`TrustedExecutor`](../interfaces/TrustedExecutor.md)

## Constructors

### Constructor

> **new HttpDispatchExecutor**(`_fetchImpl?`, `_authHeaderName?`, `_authPrefix?`): `HttpDispatchExecutor`

#### Parameters

##### \_fetchImpl?

\{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

##### \_authHeaderName?

`string` = `"Authorization"`

##### \_authPrefix?

`string` = `"Bearer "`

#### Returns

`HttpDispatchExecutor`

## Methods

### dispatch()

> **dispatch**(`instruction`, `secret`): `Promise`\<[`DispatchResult`](../interfaces/DispatchResult.md)\>

#### Parameters

##### instruction

[`DispatchInstruction`](../interfaces/DispatchInstruction.md)

##### secret

###### plaintext

`string`

###### record

[`SecretRecord`](../interfaces/SecretRecord.md)

#### Returns

`Promise`\<[`DispatchResult`](../interfaces/DispatchResult.md)\>

#### Implementation of

[`TrustedExecutor`](../interfaces/TrustedExecutor.md).[`dispatch`](../interfaces/TrustedExecutor.md#dispatch)
