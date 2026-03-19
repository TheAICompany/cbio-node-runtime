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
  "issuedIdentity": {}
}
```

Required fields:
- `agentId`: the derived root agent id for `publicKey`
- `publicKey`: the managed agent public key
- `privateKey`: the managed agent private key
- `issuedIdentity`: the signed `IssuedAgentIdentity` protocol object for the managed agent

## Required Semantics

1. `issuedIdentity.agent.public_key` must equal `publicKey`.
2. `issuedIdentity.agent.agent_id` must equal `agentId`.
3. `privateKey` must derive to `publicKey`.
4. The record is stored in the authority vault under an authority-chosen record key.
5. Loading a managed agent from this record must fail if the managed agent has been revoked by the authority.

## Compatibility

- Field names are part of the runtime contract.
- Additional fields may be ignored by readers, but writers should not depend on them for correctness.
- A future versioned schema must use an explicit version field instead of changing meanings silently.

## Non-Goals

- Defining the `IssuedAgentIdentity` protocol object itself
- Defining how the vault encrypts or persists this record
- Defining language-specific API shapes such as `issueManagedAgent(...)`
