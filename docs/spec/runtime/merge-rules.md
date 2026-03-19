# Merge Rules

## Purpose

Defines when one runtime vault may merge secrets from another vault representing the same root identity.

## Preconditions

1. Both vaults must belong to the same root identity.
2. If root identities differ, the merge must fail with `MERGE_IDENTITY_MISMATCH`.

## Conflict Modes

Supported conflict modes:
- `abort`
- `skip`
- `overwrite`

### `abort`

- If any incoming secret name already exists in the target vault, the merge must fail.
- No partial merge may be committed.

### `skip`

- Existing target secrets keep their current value.
- Incoming secrets with new names are merged.

### `overwrite`

- Incoming secrets replace target secrets with the same name.
- Incoming secrets with new names are merged.

## Required Semantics

1. Merge identity matching is determined from the vault owner identity, not from caller trust.
2. Secret names are the merge keys.
3. Secret values and their associated policy metadata must move together.
4. Merge behavior must be deterministic for a given source vault, target vault, and conflict mode.

## Result Shape

Implementations may expose result objects differently, but they must be able to report at least:
- added secret names
- skipped secret names
- overwritten secret names

## Non-Goals

- Defining a protocol object for merges
- Defining cross-process locking
- Defining transport/import mechanisms for moving sealed vault data
