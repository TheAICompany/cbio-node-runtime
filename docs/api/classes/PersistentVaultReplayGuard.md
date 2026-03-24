[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: PersistentVaultReplayGuard

## Implements

- [`ReplayGuard`](../interfaces/ReplayGuard.md)

## Constructors

### Constructor

> **new PersistentVaultReplayGuard**(`storage`, `vaultWorkingKey`, `key?`, `_lockKey?`, `_ttlMs?`): `FileReplayGuard`

#### Parameters

##### storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

##### vaultWorkingKey

`string`

##### key?

`string` = `"vault/sealed/security/replay.sealed"`

##### \_lockKey?

`string` = `"vault/sealed/locks/replay"`

##### \_ttlMs?

`number` = `...`

#### Returns

`FileReplayGuard`

## Methods

### assertNotReplayed()

> **assertNotReplayed**(`request`): `Promise`\<`void`\>

#### Parameters

##### request

[`DispatchRequest`](../interfaces/DispatchRequest.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ReplayGuard`](../interfaces/ReplayGuard.md).[`assertNotReplayed`](../interfaces/ReplayGuard.md#assertnotreplayed)
