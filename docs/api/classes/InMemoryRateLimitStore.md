[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Class: InMemoryRateLimitStore

## Implements

- [`RateLimitStore`](../interfaces/RateLimitStore.md)

## Constructors

### Constructor

> **new InMemoryRateLimitStore**(): `InMemoryRateLimitStore`

#### Returns

`InMemoryRateLimitStore`

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
