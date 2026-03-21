# Custody Model

This document defines the intended key and custody model for the local vault runtime.

It exists to remove ambiguity around `owner` identity, secret recovery, and the vault's working-key model.

## Scope

This runtime is a local vault / password-safe style infrastructure layer.

It is not primarily a cloud secret manager.
It is not a browser extension.
It is not a CLI.

The runtime is responsible for:

- storing secret material safely at rest
- using stored secret material during trusted vault operations
- supporting explicit owner export / reveal operations
- providing a stable custody model for higher-level products built on top

## Design Goal

The runtime must satisfy all of the following:

1. Normal vault operation must not depend on repeated owner intervention.
2. Owner must retain explicit recovery and export authority.
3. Identity proof and secret-material control must not be collapsed into one key by default.
4. The runtime must not treat a raw process-level string as the final product model.

## Core Terms

### `ownerPrivateKey`

The owner's identity-signing key.

In the current product model, this owner is the single vault admin.
Other principals should be modeled as agents with capabilities rather than additional owners.

Purpose:

- prove "this request came from the owner"
- authorize owner-scoped operations
- bind audit-visible actions to the owner identity

Non-purpose:

- not the vault's secret-material root
- not the working encryption key for stored secrets
- not the recovery key for vault custody

### `vaultWorkingKey`

The runtime's working secret-material key.

Purpose:

- protect secret material at rest
- support runtime secret use after the vault is in an operational state
- back vault-side secret load / decrypt operations

Non-purpose:

- not an owner identity key
- not a user-facing day-to-day API credential
- not the preferred recovery artifact presented to the owner

### `vaultRecoveryKey`

The owner-held recovery artifact.

Purpose:

- recover or re-establish access to vault secret custody
- support migration and disaster recovery
- preserve owner material sovereignty over stored secrets

Expected lifecycle:

- generated during vault initialization
- shown to the owner once
- then stored by the owner outside the normal runtime working path

Non-purpose:

- not the owner's signing identity
- not the normal runtime key used for every operation

## Current Runtime Surface

The persistent runtime surface uses `vaultWorkingKey` as the runtime material-control key.

The older `custodyKey` term is intentionally not part of the current product model.

## Required Separation

The runtime separates three concerns:

1. Identity authority
   `ownerPrivateKey`

2. Runtime material control
   `vaultWorkingKey`

3. Recovery authority
   `vaultRecoveryKey`

This separation is deliberate.

The runtime should not default to a model where one owner signing key directly acts as the encryption root for all stored secret material.

## Owner Relationship To Custody

Owner is the authorization authority for the vault.

Owner is not defined as the same thing as the runtime working key.

Instead:

- owner authorizes actions
- runtime custody performs storage / load / export work
- owner retains ultimate recovery and export authority through explicit product mechanisms

In practical terms:

- owner must be able to export secret plaintext through a formal audited interface
- owner must be able to recover the vault through a formal recovery mechanism
- owner does not need to directly hold the working key during normal runtime operation

## Export / Reveal Policy

For this runtime family, export is a first-class password-safe capability, not an exception.

That means:

- `exportSecret(...)` is valid product behavior
- export must be explicit
- export must be owner-scoped
- export must be audited

Future hardening such as MFA/TOTP may be added on top of this model, but it does not replace the need to define custody clearly.

## Already Added

The runtime now includes:

1. formal vault creation through `createVault(...)`
2. formal recovery-key based re-entry through `recoverVault(...)`
3. explicit `vaultWorkingKey` terminology in the persistent dependency surface
4. continued support for explicit owner export through `exportSecret(...)`

## Next

The remaining intended direction is:

1. continue tightening recovery and migration flows
2. continue reducing low-level helper use in favor of high-level lifecycle entrypoints
3. keep the custody terminology stable across docs and APIs

## What This Runtime Should Remove

The runtime should move away from these ambiguous product meanings:

- "owner cannot read secrets back"
- "owner signing key and vault secret-material key are the same by default"

## Non-Goals

This document does not require the runtime to become a cloud KMS product.

This document also does not require browser, CLI, or MCP concerns to be handled inside the runtime itself.

Those layers may consume this runtime, but they do not define the runtime's custody model.
