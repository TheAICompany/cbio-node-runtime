# CBIO Runtime Architecture

This document defines the architectural boundaries and naming rules for the runtime.

For cross-language runtime rules that Node and Rust must share, see [spec/runtime/README.md](./spec/runtime/README.md).

## Layer Boundaries

- `runtime/`: public consumer surface only.
- `protocol/`: protocol adapters and identity/crypto helpers layered on top of `cbio-protocol`.
- `vault/`: local secret storage, persistence, recovery, and secret policy enforcement.
- `agent/`: identity and managed-agent orchestration.
- `http/`: HTTP-facing workflows and local proxy helpers.
- `audit/`: activity log data structures and persistence helpers.
- `docs/`: examples, guidance, and integration patterns. Not executable product logic.
- `docs/spec/runtime/`: shared runtime contracts for multi-language implementations.

## Naming Rules

### 1. One name, one layer

Do not use the same term for different layers of authority or behavior.

- Protocol-level privileges must be named differently from runtime handle permissions.
- Internal storage records must not be named like public API concepts.

Good examples:

- `issuedCapabilities`: privileges embedded into a signed identity document
- `runtimePermissions`: permissions granted to a returned `CbioAgent` handle

### 2. Name by responsibility

Names should describe what the code does, not merely what topic it is near.

Good:

- `startLocalAuthProxy`
- `fetchWithAuth`
- `getManagedAgentCapabilities`

Bad:

- vague helper names
- names that only imply a provider or product example

### 3. Name public contracts by actual requirements

Public option and parameter names must reflect what callers truly need.

Good:

- `IdentityLoadKeys`: requires `privateKey`, allows optional `publicKey`

Bad:

- names that imply stronger requirements than the implementation actually needs

### 4. Do not promote examples into core abstractions

Common configurations belong in docs, not in the core naming system.

- External service examples such as OpenAI, Anthropic, or Resend are documentation concerns.
- Core APIs should accept general configuration such as `upstreamBaseUrl`, `authHeaderName`, and `authPrefix`.

### 5. Split option objects by operation

If one options type starts describing multiple operations, split it.

A single options object may still group inputs that are consumed by one concrete operation path.
For example, an identity load API may accept both storage binding and issued-identity binding if both are applied during the same load step.

Good:

- `ManagedAgentIssueOptions`
- `ManagedAgentLoadOptions`
- `RegisterChildIdentityOptions`

Bad:

- one broad options object that mixes issue, load, storage, and permission semantics

### 6. Internal escape hatches stay internal

If a method exists only to let implementation pieces cooperate, it should not become part of the public API shape.

- Prefer module-local coordination over public bridge methods.
- Avoid exposing internal records, vault objects, or persistence schemas from `runtime/`.

## Review Checklist

When evaluating a new function, type, or field name, ask:

1. Does this name describe one thing only?
2. Does it reveal the correct layer and authority level?
3. Would a user infer the correct behavior without reading implementation code?
4. Is this a stable domain concept, or just a popular example?
5. Is this exposing an internal detail as if it were public API?

If any answer is "no", rename or split before expanding the API surface.
