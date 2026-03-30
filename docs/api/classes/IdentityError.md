[**CBIO Node Runtime Agent API v1.74.0**](../README.md)

***

# Class: IdentityError

Runtime export.
Main API: typed high-level runtime plus supported low-level building blocks.

## Extends

- `Error`

## Constructors

### Constructor

> **new IdentityError**(`code`, `message`, `options?`): `IdentityError`

#### Parameters

##### code

[`IdentityErrorCode`](../enumerations/IdentityErrorCode.md)

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`IdentityError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: [`IdentityErrorCode`](../enumerations/IdentityErrorCode.md)

## Methods

### isIdentityError()

> `static` **isIdentityError**(`e`): `e is IdentityError`

#### Parameters

##### e

`unknown`

#### Returns

`e is IdentityError`
