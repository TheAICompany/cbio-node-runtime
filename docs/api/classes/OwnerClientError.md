[**CBIO Node Runtime Agent API v1.53.0**](../README.md)

***

# Class: OwnerClientError

Runtime export.
Main API: typed high-level runtime plus supported low-level building blocks.

## Extends

- `Error`

## Constructors

### Constructor

> **new OwnerClientError**(`code`, `message`, `options?`): `OwnerClientError`

#### Parameters

##### code

[`OwnerClientErrorCode`](../enumerations/OwnerClientErrorCode.md)

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`OwnerClientError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: [`OwnerClientErrorCode`](../enumerations/OwnerClientErrorCode.md)

## Methods

### isOwnerClientError()

> `static` **isOwnerClientError**(`e`): `e is OwnerClientError`

#### Parameters

##### e

`unknown`

#### Returns

`e is OwnerClientError`
