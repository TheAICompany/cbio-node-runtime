# CBIO Vault Runtime Reference

This document describes the current implemented runtime surface.

This file is intentionally narrower: it documents what the shipped API does today.

## Public Surface

The current top-level surface centers on:

- identity creation and recovery
- persistent vault bootstrap and recovery
- owner and agent clients
- owner flow-boundary helpers

The main constructors are:

- `createIdentity(...)`
- `createChildIdentity(...)`
- `deriveChildIdentity(...)`
- `ensurePrivateVault(...)`
- `restoreIdentity(...)`
- `createVault(...)`
- `recoverVault(...)`
- `createVaultClient(...)`
- `createAgentClient(...)`

Related design note:

- [Custody Model](CUSTODY_MODEL.md)

Recommended persistent-vault entrypoints:

- `createVault(...)`
- `recoverVault(...)`

`createVault({ ownerIdentity, nickname })` creates a vault in the default workspace and persists `nickname` into `vaults/<vaultId>/vault/profile.json`.

`createVault(storage, { ownerIdentity, nickname })` overrides the workspace storage explicitly.

`recoverVault({ vaultId, ownerIdentity })` reopens a vault from the default workspace and returns the persisted `nickname` when present.

`recoverVault(storage, { vaultId, ownerIdentity })` overrides the workspace storage explicitly.

## Terms

- `identity`
  An external principal represented by a public/private keypair.
- `owner`
  The single admin role that a vault binds to one identity.
- `agent`
  A delegated role that a vault binds to an identity registered by the owner.

Role rules:

- outside the vault there are only identities
- inside a vault, identities are bound to roles such as `owner` or `agent`
- root identities are independent
- child identities may be deterministically derived from a parent identity
- the same identity may be `owner` in one vault and `agent` in another

## Identity Creation

`createIdentity(...)` returns:

- `identityId`
- `publicKey`
- `privateKey`
- optional `nickname`
- optional `parentIdentityId` for child identities
- optional `childIndex` for child identities

`nickname` is human-readable only. It does not affect the derived `identityId`, cryptographic verification, or vault-local role binding.

`createChildIdentity(storage, parentIdentity, { nickname })` allocates the next `childIndex` from storage and creates a child identity.

`deriveChildIdentity(parentIdentity, childIndex, { nickname })` deterministically reconstructs a child identity for a known `childIndex`.

`ensurePrivateVault(storage, identity)` creates or refreshes the identity's fixed namespace under `identities/<identityId>/...`. That namespace stores identity-level files such as:

- `profile.json`
- `children.json`

`restoreIdentity(privateKey)` returns the same shape for an existing private key.

## Secret-Flow Model

The current HTTP-facing API supports two explicit secret-flow classes:

- `acquire_secret`
  No secret leaves the vault. A response-derived secret is stored into the vault. Agent-visible output is limited to protocol metadata and a redacted response shape.

- `send_secret`
  A stored secret is sent to an owner-approved target. The remote response is treated as normal business output and may be returned to the agent.

This is a deliberate protocol boundary:

- acquisition responses are assumed sensitive and are therefore redacted on the way back to the agent
- dispatch responses are treated as ordinary HTTP results once the owner has authorized sending the secret to that target

The runtime does not try to reinterpret every remote protocol. If an approved target returns sensitive values during a normal dispatch call, that is part of the target contract and owner authorization scope rather than a vault-side parsing obligation.

The runtime does not claim to understand arbitrary network protocols. The API communicates only the currently supported boundary:

- supported: explicit acquisition into vault through built-in standard flows
- supported: explicit secret-backed outbound dispatch
- supported: owner-defined `custom_http` flows for explicit exception cases
- unsupported: mixed bidirectional-secret flows as a first-class surface
- unsupported: no-secret operations as a first-class vault primitive

## Vault Client

`clients/owner` implements the public vault-management client surface for the identity currently bound to the vault's single admin role.

Current management operations:

- `storeSecret(...)`
- `defineSecretTargets(...)`
- `writeSecret(...)`
- `exportSecret(...)`
- `readAudit(...)`
- `registerAgent(...)`
- `grantCapability(...)`
- `registerFlow(...)`

Example:

```ts
const client = createVaultClient({ ownerIdentity, vault });

const storedSecret = await client.storeSecret({
  alias: 'api-token',
  plaintext: 'secret-value',
});

await client.defineSecretTargets({
  alias: storedSecret.alias.value,
  targetBindings: [
    {
      kind: 'site',
      targetId: 'api.example.com',
      targetUrl: 'https://api.example.com/endpoint',
      methods: ['POST'],
    },
  ],
});

await client.registerAgent({
  agentId: 'agent-1',
  publicKey: agentPublicKey,
});

await client.registerFlow({
  flowId: 'custom-status-read',
  mode: 'send_secret',
  targetUrl: 'https://api.example.com/custom-status',
  method: 'POST',
  responseVisibility: 'shape_only',
});

await client.writeSecret({
  alias: 'secondary-token',
  plaintext: 'secret-value',
  targetBindings: [
    {
      kind: 'site',
      targetId: 'api.example.com',
      targetUrl: 'https://api.example.com/endpoint',
      methods: ['POST'],
    },
  ],
});

const exportedSecret = await client.exportSecret({
  alias: 'api-token',
});
```

`writeSecret(...)` is the one-step variant and requires `targetBindings`.

## Agent Client

`clients/agent` creates signed dispatch requests for an identity currently bound to an agent role in that vault. It never receives plaintext secrets.

Current dispatch capabilities use `dispatch_http` as the explicit secret-send operation.
It is intended for standard secret-backed resource access, not for token mint / refresh / exchange / registration-finalize style acquisition flows.

The runtime also supports `custom_http` as an owner-defined exception path. A `custom_http` capability must reference a registered `customFlowId`.
Owner-defined HTTP boundaries share one factory layer:

- `createOwnerHttpFlowBoundary(...)`
- `createStandardAcquireBoundary(...)`
- `createStandardDispatchBoundary(...)`

The owner-defined flow may use one of three modes:

- `acquire_secret`
- `send_secret`
- `bidirectional_secret`

Example:

```ts
const capability = {
  vaultId: vault.vaultId,
  capabilityId: 'cap-1',
  agentId: agentIdentity.identityId,
  secretAliases: ['api-token'],
  operation: 'dispatch_http',
  allowedTargets: ['https://api.example.com/endpoint'],
  allowedMethods: ['POST'],
  issuedAt: new Date().toISOString(),
};

await client.grantCapability({ capability });
```

The public agent capability type is the same shape as core `AgentCapability`, so `custom_http` capabilities are valid here too.

Custom capability example:

```ts
const customCapability = {
  vaultId: vault.vaultId,
  capabilityId: 'cap-custom',
  agentId: agentIdentity.identityId,
  customFlowId: 'custom-status-read',
  secretAliases: ['api-token'],
  operation: 'custom_http',
  allowedTargets: ['https://api.example.com/custom-status'],
  allowedMethods: ['POST'],
  issuedAt: new Date().toISOString(),
};

await client.grantCapability({ capability: customCapability });
```

Recommended agent client shape:

```ts
const agent = createAgentClient({
  agentIdentity,
  capability,
  vault,
});
```

## Acquisition Result Shape

`acquireSecret(...)` is the explicit acquisition operation.

It no longer accepts an open-ended extractor callback. The current surface only supports built-in protocol flows:

- `oauth_token_response.access_token`
- `oauth_token_response.refresh_token`
- `openid_token_response.id_token`

Input:

```ts
const acquireBoundary = createStandardAcquireBoundary({
  targetUrl: 'https://issuer.example.com/token',
  responseField: 'access_token',
  storeAlias: 'issuer-token',
});

const acquired = await vault.acquireSecret({
  alias: acquireBoundary.responseSecret.storeAlias,
  issuerId: 'issuer-1',
  url: acquireBoundary.targetUrl,
  flow: 'oauth_token_response.access_token',
  method: acquireBoundary.method,
});
```

Output:

```ts
type VaultAcquireSecretResult = {
  vaultId: VaultId;
  alias: string;
  status: 'stored';
  responseStatus: number;
  contentType: string | null;
  responseShape: RedactedResponseShape;
};
```

`responseShape` is flow-specific. It preserves only the protocol-defined non-sensitive fields that the runtime explicitly allows for that built-in flow.

Example:

```ts
{
  token_type: 'Bearer',
  expires_in: 3600,
  scope: 'read write',
}
```

## Dispatch Result Shape

`dispatch_http` returns normal remote output:

```ts
type DispatchResult = {
  vaultId: VaultId;
  requestId: string;
  status: 'succeeded' | 'denied' | 'failed';
  targetUrl: string;
  method: string;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
};
```

This is an intentional current-surface choice: `dispatch_http` is treated as secret-out / non-secret-in.

In other words, the vault respects the standard HTTP response surface for normal dispatch. It does not attempt to retroactively sanitize every downstream response body, because doing so would shift responsibility away from the target protocol and the owner's authorization decision.

For `custom_http`, response visibility is chosen by the owner at flow registration time:

- `passthrough`: return the remote body
- `shape_only`: return a redacted shape-only body

If the custom flow mode includes secret acquisition, the owner also defines a response secret rule. The current built-in rule shape is:

```ts
{
  kind: 'json_field',
  field: 'access_token',
  storeAlias: 'new-token',
}
```

## Persistent Dependencies

`createPersistentVaultCoreDependencies(...)` builds a file-backed single-node profile with:

- persistent secret metadata
- sealed secret custody blobs
- append-only tamper-evident audit
- persistent replay guard
- persistent rate-limit state
- persistent capability revocation state
- persistent owner identity record
- persistent agent identity registry
- persistent capability registry

## Storage Provider

Any backend can be used by implementing `IStorageProvider`:

```ts
export interface IStorageProvider {
  read(key: string): Promise<Buffer | null>;
  write(key: string, data: Buffer): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  rename?(fromKey: string, toKey: string): Promise<void>;
  withLock?<T>(key: string, task: () => Promise<T>): Promise<T>;
}
```

`withLock(...)` is used when present to serialize read-modify-write persistence sequences.
