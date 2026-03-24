[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: PersistentVaultRateLimitStore

## Implements

- [`RateLimitStore`](../interfaces/RateLimitStore.md)

## Constructors

### Constructor

> **new PersistentVaultRateLimitStore**(`storage`, `vaultWorkingKey`, `key?`, `_lockKey?`): `FileRateLimitStore`

#### Parameters

##### storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

##### vaultWorkingKey

`string`

##### key?

`string` = `"vault/sealed/security/rate-limits.sealed"`

##### \_lockKey?

`string` = `"vault/sealed/locks/rate-limits"`

#### Returns

`FileRateLimitStore`

## Methods

### consume()

> **consume**(`key`, `maxRequests`, `windowMs`, `nowMs`): `Promise`\<`void`\>

#### Parameters

##### key

`string`

##### maxRequests

`number`

##### windowMs

`number`

##### nowMs

`number`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`RateLimitStore`](../interfaces/RateLimitStore.md).[`consume`](../interfaces/RateLimitStore.md#consume)
