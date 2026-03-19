# Managed Agent Record

## Purpose

Defines the persisted local record format used by a parent identity to store a managed agent identity in its own vault.

This is a runtime record, not a protocol object.

## Record Shape

The persisted JSON object must contain:

```json
{
  "agentId": "string",
  "publicKey": "string",
  "privateKey": "string",
  "issuedIdentity": {},
  "storageKey": "string"
}
```

Required fields:
- `agentId`: the derived root agent id for `publicKey`
- `publicKey`: the managed agent public key
- `privateKey`: the managed agent private key
- `issuedIdentity`: the signed `IssuedAgentIdentity` protocol object for the managed agent

Optional fields:
- `storageKey`: the vault storage key where the managed agent's vault data is or should be persisted. When present, loaders must use it to restore the same vault binding used at issuance; when absent, loaders may use an implementation-defined default (e.g. derived from `publicKey`).

## Required Semantics

1. `issuedIdentity.agent.public_key` must equal `publicKey`.
2. `issuedIdentity.agent.agent_id` must equal `agentId`.
3. `privateKey` must derive to `publicKey`.
4. The record is stored in the authority vault under an authority-chosen record key.
5. Loading a managed agent from this record must fail if the managed agent has been revoked by the authority.
6. When `storageKey` is present, loaders must prefer it for vault binding; writers may depend on this for correctness.

## Compatibility

- Field names are part of the runtime contract.
- `storageKey` is a defined optional field; writers may depend on readers honoring it when present.
- Other additional fields may be ignored by readers, and writers should not depend on them for correctness.
- A future versioned schema must use an explicit version field instead of changing meanings silently.

## Non-Goals

- Defining the `IssuedAgentIdentity` protocol object itself
- Defining how the vault encrypts or persists this record
- Defining language-specific API shapes such as `issueManagedAgent(...)`
