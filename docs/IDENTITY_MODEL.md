# Identity Model

This document defines the runtime's current identity model.

Its purpose is to separate three things that are easy to confuse:

- cryptographic identity
- human-readable naming
- vault-local role assignment

## Core Rule

Outside the vault, there are only identities.

Inside a specific vault, identities may be bound to roles such as `owner` or `agent`.

This means:

- `owner` is not a different species of identity
- `agent` is not a different species of identity
- role comes from vault-local authorization state, not from the keypair itself

## Identity

An `identity` is an external principal represented by a public/private keypair.

Properties:

- independent by default
- no built-in parent/child lineage
- no built-in inheritance
- no built-in "owner creates agent identity" relationship

An identity may participate in multiple vaults, and may hold different roles in different vaults.

Example:

- the same identity may be `owner` in vault A
- and `agent` in vault B

## Identity Material

The runtime treats public/private keys as the cryptographic identity material.

- `publicKey`
  used for verification and binding
- `privateKey`
  held outside the vault by the identity holder

The vault should not treat a display label as the root identity truth.

## Stable Identity ID

The runtime already has a stable public-key-derived identity primitive available through `deriveRootAgentId(...)`.

That derived value is useful for:

- stable machine identity
- local naming
- deterministic display-independent references

It should not, by itself, determine vault-local role.

## Labels And Human-Readable Names

Human-friendly names are still useful.

Examples:

- `owner-1`
- `agent-prod`
- `crawler`
- `alice`

These should be treated as labels, aliases, or local names rather than the deepest identity truth.

In other words:

- public key or a stable derived id answers "who is this cryptographically"
- label answers "what do humans call this identity here"

## Vault Roles

Vault roles are authorization bindings applied to identities inside a specific vault.

Current role model:

- `owner`
  the single admin role for one vault
- `agent`
  a delegated role registered and authorized by the owner

These roles are vault-local.

So:

- an identity does not become globally `owner`
- an identity does not become globally `agent`
- the same identity may appear with different roles in different vaults

## Current Runtime Reality

Today the runtime API still uses fields such as:

- `ownerId`
- `agentId`

In practice, these currently behave closer to role-bound local identifiers or labels than to the deepest cryptographic identity root.

The long-term intended direction is:

1. keep cryptographic identity separate from labels
2. keep vault-local role separate from both
3. avoid treating naming conventions such as prefixes as identity truth

## Non-Goals

This model does not require every current API field to be renamed immediately.

Its purpose is to define the correct semantics first, so later API changes can converge on one stable interpretation.
