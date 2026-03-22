# cbio Vault Runtime

Node.js vault runtime with a hard-cut architecture: vault core first, explicit clients second.

**Source:** [https://github.com/TheAICompany/cbio-node-runtime](https://github.com/TheAICompany/cbio-node-runtime)

## Documentation / 文档 / ドキュメント / 문서 / Docs

- [English](README.md)
- [Custody Model](docs/CUSTODY_MODEL.md)
- [Identity Model](docs/IDENTITY_MODEL.md)
- [中文](docs/zh/README.md)
- [日本語](docs/ja/README.md)
- [한국어](docs/ko/README.md)
- [Español](docs/es/README.md)
- [Português](docs/pt/README.md)
- [Français](docs/fr/README.md)

---

- No CLI
- No TUI

Main export now centers on:
- identity creation and recovery
- persistent vault bootstrap and recovery
- owner and agent clients
- owner flow-boundary helpers

## Install

Requires Node >= 18.

```bash
npm install @the-ai-company/cbio-node-runtime
```

## Usage

```ts
import {
  createChildIdentity,
  createIdentity,
  createWorkspaceStorage,
  ensureIdentityPrivateVault,
  restoreIdentity,
  createVault,
  recoverVault,
  createOwnerHttpFlowBoundary,
  createStandardAcquireBoundary,
  createVaultClient,
  createAgentClient,
  FsStorageProvider,
} from '@the-ai-company/cbio-node-runtime';
```

Identity restore example:

```ts
const identity = restoreIdentity(existingPrivateKey);
```

Child identity example:

```ts
const rootIdentity = createIdentity({ nickname: 'root' });
await ensureIdentityPrivateVault(storage, rootIdentity);
const childIdentity = await createChildIdentity(storage, rootIdentity, {
  nickname: 'worker-1',
});
```

Vaults also support an optional human-readable nickname:

```ts
const createdVault = await createVault({
  ownerIdentity: rootIdentity,
  nickname: 'main-vault',
});
```

If you want to override the default workspace directory:

```ts
const storage = createWorkspaceStorage('/tmp/cbio');
const createdVault = await createVault(storage, {
  ownerIdentity: rootIdentity,
  nickname: 'main-vault',
});
```

The workspace root can contain many vaults. Each vault is isolated under `vaults/<vaultId>/...`.

Each identity now has its own private namespace in storage under `vault/private/identities/<identityId>/...`. That namespace holds identity-level metadata such as:

- `profile.json`
- `children.json`

## Architecture

Core terms:

- `identity`
  An external principal represented by a public/private keypair.
- `owner`
  The single admin role that a vault binds to one identity.
- `agent`
  A delegated role that a vault binds to an identity registered by the owner.

Important role rule:

- outside the vault there are only identities
- inside a specific vault, those identities may be bound to roles such as `owner` or `agent`
- root identities are independent
- child identities may be deterministically derived from a parent identity

The public runtime surface follows four hard rules:

1. Secret plaintext lives only in vault core.
2. Only owner and vault-trusted acquisition paths may write secrets.
3. Secrets are dispatched only to owner-approved or issuer-bound targets.
4. Vault validates and audits everything.

The current HTTP-facing interface distinguishes two supported secret-flow classes:

- `A` / `acquire_secret`
  No secret leaves the vault. A secret is extracted from the response and stored into the vault. Agent-visible output includes only protocol metadata plus a redacted response shape.
- `B` / `send_secret`
  A stored secret is sent to an owner-approved target. The response is treated as normal business output and may be returned to the agent.

This is an intentional boundary choice:

- acquisition responses are treated as sensitive because they may contain newly issued secret material
- dispatch responses are treated as ordinary protocol results because the operation itself is a standard secret-backed HTTP call to an owner-approved target

The vault does not attempt to second-guess every remote protocol. If a target returns sensitive data during a normal dispatch flow, that is part of the target contract and the owner's authorization decision.

The runtime does not claim to understand arbitrary remote protocols. The API boundary makes clear what is supported:

- acquisition is explicit and redacted
- secret-backed dispatch is explicit and capability-gated
- unsupported `C` / `D` style flows are not part of the current surface

Owner-defined HTTP boundaries share one factory layer:

- `createOwnerHttpFlowBoundary(...)`
- `createStandardAcquireBoundary(...)`
- `createStandardDispatchBoundary(...)`

An owner-defined exception path also exists for non-standard but intentional integrations:

- owner may register a `custom_http` flow
- the flow fixes mode, target, method, and response visibility inside the vault
- agent may only invoke the registered `customFlowId`
- this is an explicit escape hatch, not the default path

## Status

The old identity-centric runtime is no longer the intended public architecture.
This package now exposes the production local vault runtime surface as the primary API.

## Example Shape

```ts
const ownerIdentity = createIdentity({ nickname: 'owner-main' });
const agentIdentity = createIdentity({ nickname: 'agent-worker' });
const createdVault = await createVault({ ownerIdentity });
const client = createVaultClient({ ownerIdentity, vault: createdVault.vault });
const agent = createAgentClient({ agentIdentity, capability, vault: createdVault.vault });
```

Owner API example:

```ts
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
```

`writeSecret(...)` is the one-step variant and requires `targetBindings`.

Capability example:

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

Custom flow example:

```ts
await client.registerFlow({
  flowId: 'custom-status-read',
  ...createOwnerHttpFlowBoundary({
    mode: 'send_secret',
    targetUrl: 'https://api.example.com/custom-status',
    method: 'POST',
    responseVisibility: 'shape_only',
  }),
});
```

Acquisition example:

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

console.log(acquired.responseShape);
// { token_type: 'Bearer', expires_in: 3600, scope: 'read write' }

const exported = await client.exportSecret({
  alias: 'issuer-token',
});

console.log(exported.plaintext);
```

Persistent custody bootstrap example:

```ts
const ownerIdentity = createIdentity({ nickname: 'owner-main' });
const storage = new FsStorageProvider('/tmp/cbio-vault');
const createdVault = await createVault(storage, {
  vaultId: 'vault-persistent',
  ownerIdentity,
});

const recoveredVault = await recoverVault(storage, {
  vaultId: 'vault-persistent',
  ownerIdentity,
});
```

## Build

```bash
npm run build
npm run test
```
