# CBIO Runtime Spec

This directory defines runtime rules that must stay consistent across language implementations such as Node and Rust.

These files are not Node-specific API docs. They are shared runtime contracts.

Use this directory for:
- local persisted record schemas
- runtime-only policy rules
- merge and recovery semantics
- audit/event semantics

Do not use this directory for:
- Node-only helper APIs
- examples or tutorials
- protocol-layer governance objects already defined by `@the-ai-company/cbio-protocol`

## Current Runtime Spec Set

- [managed-agent-record.md](./managed-agent-record.md): persisted local record for a managed agent identity
- [merge-rules.md](./merge-rules.md): vault merge preconditions and conflict behavior
- [secret-origin-policy.md](./secret-origin-policy.md): allowed origin policy for acquired and rotated secrets
- [activity-log.md](./activity-log.md): local audit event schema and failure semantics
- [secret-validation.md](./secret-validation.md): local compare/proof semantics and versioning contract for future validator adapters
- [exposure-surfaces.md](./exposure-surfaces.md): current runtime exposure surfaces, mitigations, and future hardening areas

## Spec Versioning

Runtime specs in this directory use:

- an integer version number
- a lifecycle status suffix such as `draft` or `stable`

Examples:

- `v1-draft`
- `v1-stable`
- `v2-draft`

This keeps compatibility decisions obvious while the runtime incubates behavior before anything graduates into a broader protocol contract.

## Design Goal

If a Node runtime and a Rust runtime both claim to implement CBIO runtime behavior, these rules must mean the same thing in both implementations.
