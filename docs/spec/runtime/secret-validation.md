# Secret Validation

## Spec Version

- `version`: `1`
- `status`: `draft`
- Display form: `v1-draft`

This document defines the runtime contract for local secret proof and validation-oriented operations.

This is a runtime spec, not a protocol object.

## Purpose

Defines how a CBIO runtime may:

- prove possession of a secret without exporting it
- compare a candidate against a stored secret without exporting it
- evolve toward provider-backed remote validation without changing the core result semantics

## Scope

This spec currently covers:

- local compare semantics
- local proof semantics
- versioning rules for future remote validator adapters

This spec does not yet define:

- provider-specific validator endpoints
- cross-network proof exchange formats
- third-party CBIO-native validation endpoints

## Versioning Rules

Runtime secret validation specs use:

- an integer `version`
- a lifecycle `status`

Examples:

- `v1-draft`
- `v1-stable`
- `v2-draft`

Rules:

1. Increment the integer version when behavior, required fields, or result semantics change incompatibly.
2. Change only the status when the semantics stay the same but implementation confidence changes.
3. Do not reuse an older integer version for different semantics.

## Local Compare Semantics

`compareSecret(secretName, candidate)` must:

1. return `true` only when the candidate exactly matches the active secret value
2. return `false` when the candidate does not match
3. fail with `SECRET_NOT_FOUND` when the named secret does not exist
4. not return the stored secret value in cleartext
5. use a comparison method suitable for secret material

## Local Proof Semantics

`proveSecret(secretName, challenge, options?)` must:

1. fail with `SECRET_NOT_FOUND` when the named secret does not exist
2. not return the stored secret value in cleartext
3. deterministically derive a proof from:
   - the active secret value
   - the provided challenge
   - the selected algorithm

### Defined Algorithms

Current algorithm names:

- `sha256`
- `sha512`

For `v1-draft`, the proof value is:

- `HMAC(algorithm, secretValue, challenge)`
- encoded as `base64url`

## Permission Semantics

Runtime handles must treat local compare/proof operations as secret acquisition-class capabilities.

For `v1-draft`:

- `CbioIdentity` may invoke these operations
- `CbioAgent` requires `vault:acquire`

## Forward Compatibility

Future versions may add remote validator contracts that return structured validation results such as:

- `valid`
- `reason`
- `providerSubject`
- `expiresAt`
- `scopes`
- `metadata`

Those result objects must be versioned under this spec family rather than silently changing local compare/proof semantics.

## Non-Goals

- Defining a cloud KMS protocol
- Defining provider-specific auth probe behavior
- Defining how third-party websites must expose validation endpoints
