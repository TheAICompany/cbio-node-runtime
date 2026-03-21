# cbio Vault Runtime

Node.js vault runtime with a hard-cut architecture: vault core first, explicit clients second.

**Source:** [https://github.com/TheAICompany/cbio-node-runtime](https://github.com/TheAICompany/cbio-node-runtime)

## Documentation / 文档 / ドキュメント / 문서 / Docs

- [English](README.md)
- [Custody Model](docs/CUSTODY_MODEL.md)
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
- `vault-core`
- `vault-ingress`
- `clients/owner`
- `clients/agent`

## Install

Requires Node >= 18.

```bash
npm install @the-ai-company/cbio-node-runtime
```

## Usage

```ts
import {
  createVaultService,
  createDefaultVaultCoreDependencies,
  initializePersistentVault,
  recoverPersistentVault,
  createOwnerHttpFlowBoundary,
  createStandardAcquireBoundary,
  createStandardDispatchBoundary,
  createOwnerClient,
  createAgentClient,
  FsStorageProvider,
  InMemoryVaultCapabilityResolver,
  LocalVaultTransport,
} from '@the-ai-company/cbio-node-runtime';
```

## Architecture

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

## Modules

- `vault-core`
  The vault kernel. Stores plaintext, authorizes writes, authorizes dispatch, executes dispatch, appends audit.

- `vault-ingress`
  Vault boundary/facade. Accepts request-shaped calls, handles trusted acquisition paths, and keeps capability resolution plus dispatch ingress inside the vault trust boundary.

- `clients/owner`
  Owner-facing client. Writes secrets, exports plaintext secrets, and reads audit.

- `clients/agent`
  Agent-facing client. Creates signed dispatch requests. Never handles plaintext secret.

## Status

The old identity-centric runtime is no longer the intended public architecture.
This package now exposes the production local vault runtime surface as the primary API.

## Example Shape

```ts
const capabilities = new InMemoryVaultCapabilityResolver();
const vault = createVaultService(createDefaultVaultCoreDependencies(), { capabilities });
const owner = createOwnerClient(ownerIdentity, vault, ownerSigner, clock);
const transport = new LocalVaultTransport(vault, capability.capabilityId);
const agent = createAgentClient(agentIdentity, capability, signer, transport, clock);
```

Capability example:

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

Custom flow example:

```ts
await owner.registerCustomFlow({
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

const exported = await owner.exportSecret({
  alias: 'issuer-token',
});

console.log(exported.plaintext);
```

Persistent custody bootstrap example:

```ts
const storage = new FsStorageProvider('/tmp/cbio-vault');
const initializedVault = await initializePersistentVault(storage, {
  vaultId: 'vault-persistent',
  bootstrapOwner: {
    vaultId: { value: 'vault-persistent' },
    ownerId: 'owner-1',
    publicKey: ownerPublicKey,
  },
});

// Show once to the owner and let them store it offline.
console.log(initializedVault.initializedCustody.vaultRecoveryKey);

const recoveredVault = await recoverPersistentVault(storage, {
  vaultId: 'vault-persistent',
  initializedVault.initializedCustody.vaultRecoveryKey,
});
```

## Build

```bash
npm run build
npm run test
```
