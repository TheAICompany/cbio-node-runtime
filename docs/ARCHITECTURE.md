# Architecture

Current product architecture is vault-first.

## Public Modules

- `vault-core`
  Stores secret plaintext, validates writes, validates dispatch, appends audit, invokes trusted executors.

- `clients/owner`
  Owner-facing client for secret writes and audit reads.

- `clients/agent`
  Agent-facing client for signed dispatch requests. It never receives secret plaintext.

- `vault-ingress`
  Accepts request-shaped calls, resolves capability inside the vault boundary, performs trusted acquisition flows, and forwards dispatch into vault-core internals.

## Core Rules

1. Secret plaintext exists only inside vault-core.
2. Only owner and trusted issuer paths may write secrets.
3. Agent can only request dispatch through capability + proof.
4. Vault validates and audits every dispatch.

## Current HTTP Secret Flows

The current runtime surface supports two explicit flow classes:

- `acquire_secret`
  Vault performs an acquisition flow, stores the extracted secret, and returns only protocol metadata plus a redacted response shape.

- `send_secret`
  Vault sends a stored secret to an approved target and returns the remote response as normal agent-visible output.
  This is the standard secret-use path, not the acquisition path.

The runtime does not attempt to enumerate or understand arbitrary remote protocols. Acquisition is limited to built-in standard flows rather than caller-defined extraction logic. Unsupported mixed or non-secret flows are outside the current first-version surface.

This is deliberate rather than accidental:

- acquisition flows are treated as sensitive on the response path because they may mint or return new secret material
- normal secret-backed dispatch is treated as a standard protocol call to an owner-approved target

If a target returns sensitive values during a normal dispatch flow, the vault does not try to reinterpret the remote protocol and redact it retroactively. That responsibility belongs to the remote protocol contract and the owner's authorization boundary.

## Owner-Defined Custom HTTP Flows

The current runtime also exposes a narrow exception path for non-standard integrations:

- owner registers a `custom_http` flow
- the flow fixes `mode`, `targetUrl`, `method`, and `responseVisibility`
- agent capabilities reference `customFlowId`
- agent may trigger the flow, but may not redefine it

The owner HTTP boundary itself is modeled as a factory surface:

- `createOwnerHttpFlowBoundary(...)`
- `createStandardAcquireBoundary(...)`
- `createStandardDispatchBoundary(...)`

This keeps the escape hatch inside the vault boundary rather than reopening caller-defined open extraction or open response policies.

Current custom modes are:

- `acquire_secret`
- `send_secret`
- `bidirectional_secret`
