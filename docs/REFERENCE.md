# CBIO Vault Runtime Reference

This document describes the current implemented runtime surface.

This file is intentionally narrower: it documents what the shipped API does today.

## Public Surface

The current top-level modules are:

- `vault-core`
- `vault-ingress`
- `clients/owner`
- `clients/agent`

The main constructors are:

- `createVaultCore(...)`
- `createVaultService(...)`
- `initializePersistentVault(...)`
- `recoverPersistentVault(...)`
- `createOwnerClient(...)`
- `createAgentClient(...)`
- `LocalVaultTransport`

Related design note:

- [Custody Model](CUSTODY_MODEL.md)

Recommended persistent-vault entrypoints:

- `initializePersistentVault(...)`
- `recoverPersistentVault(...)`

Lower-level custody helpers:

- `initializeVaultCustody(...)`
- `recoverVaultWorkingKey(...)`

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

## Vault Service

`vault-ingress` is the request-shaped boundary around the vault kernel.

Important methods:

- `bootstrapOwnerIdentity(...)`
- `registerAgentIdentity(...)`
- `registerOwnerIdentity(...)`
- `writeSecret(...)`
- `exportSecret(...)`
- `acquireSecret(...)`
- `dispatch(...)`
- `handleAgentDispatch(...)`
- `readAudit(...)`

### Owner Bootstrap

The very first owner is bootstrapped explicitly:

```ts
await vault.bootstrapOwnerIdentity({
  vaultId: vault.vaultId,
  ownerId: 'owner-1',
  publicKey: ownerPublicKey,
});
```

After that, additional owner and agent identities should be registered through owner-signed commands rather than direct raw records.

## Owner Client

`clients/owner` is the owner-facing caller surface.

Current owner operations:

- `writeSecret(...)`
- `exportSecret(...)`
- `getAudit(...)`
- `registerAgentIdentity(...)`
- `registerOwnerIdentity(...)`
- `registerCustomFlow(...)`

Example:

```ts
const owner = createOwnerClient(ownerIdentity, vault, ownerSigner, clock);

await owner.registerAgentIdentity({
  agentId: 'agent-1',
  publicKey: agentPublicKey,
});

await owner.registerCustomFlow({
  flowId: 'custom-status-read',
  mode: 'send_secret',
  targetUrl: 'https://api.example.com/custom-status',
  method: 'POST',
  responseVisibility: 'shape_only',
});

await owner.writeSecret({
  alias: 'api-token',
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

const exportedSecret = await owner.exportSecret({
  alias: 'api-token',
});
```

## Agent Client

`clients/agent` creates signed dispatch requests. It never receives plaintext secrets.

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
  agentId: 'agent-1',
  secretAliases: ['api-token'],
  operation: 'dispatch_http',
  allowedTargets: ['https://api.example.com/endpoint'],
  allowedMethods: ['POST'],
  issuedAt: new Date().toISOString(),
};
```

Custom capability example:

```ts
const customCapability = {
  vaultId: vault.vaultId,
  capabilityId: 'cap-custom',
  agentId: 'agent-1',
  customFlowId: 'custom-status-read',
  secretAliases: ['api-token'],
  operation: 'custom_http',
  allowedTargets: ['https://api.example.com/custom-status'],
  allowedMethods: ['POST'],
  issuedAt: new Date().toISOString(),
};
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

It still expects caller-provided identity registries unless you supply your own persistent registry adapters.

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
