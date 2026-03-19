# cbio Node Runtime

Node.js runtime for cbio identity and credential vault. Library only.

**⚠️ Actively under development — not a stable release.**

**Source:** [https://github.com/TheAICompany/cbio-node-runtime](https://github.com/TheAICompany/cbio-node-runtime)

## Documentation / 文档 / ドキュメント / 문서 / Docs

- [English](README.md)
- [中文](docs/zh/README.md)
- [日本語](docs/ja/README.md)
- [한국어](docs/ko/README.md)
- [Español](docs/es/README.md)
- [Português](docs/pt/README.md)
- [Français](docs/fr/README.md)

---

- No CLI
- No TUI

Import and use `CbioIdentity`, `CbioAgent` from the main export.

For registration flows that mint a new secret locally, use `startLocalSecretIngress(...)` to let a trusted local process `POST` the newly issued value straight into the vault without printing it to terminal output first.

## Install

Requires Node >= 18.

```bash
npm install @the-ai-company/cbio-node-runtime
```

## Usage

```ts
import { CbioIdentity, CbioAgent, generateIdentityKeys } from '@the-ai-company/cbio-node-runtime';

const keys = generateIdentityKeys();
const identity = await CbioIdentity.load({ privateKey: keys.privateKey });
const agent: CbioAgent = identity.getAgent(); // minimal permissions: vault:fetch, vault:list
```

## Secret Boundary Model

After root initialization, runtime-supported secret flows are designed around `no plaintext export`.

- Acquire and store from a remote issuer: `fetchJsonAndAddSecret(...)`
- Ingest a newly issued local secret without `stdout`: `startLocalSecretIngress(...)`
- Use a stored secret remotely: `fetchWithAuth(...)`, `createFetchWithAuth(...)`, `startLocalAuthProxy(...)`
- Prove or compare a stored secret locally without exporting it: `proveSecret(...)`, `compareSecret(...)`
- Validate a stored secret through a controlled validator: `validateSecret(...)`

The public runtime surface is intended to let applications use, prove, and validate secrets without retrieving them as cleartext.

## Recommended Paths

### Remote Issuer -> Vault

```ts
const acquired = await identity.fetchJsonAndAddSecret({
  secretName: 'service-token',
  url: 'https://issuer.example.com/token',
  extractKey: (response: { token?: string }) => response.token ?? '',
});
```

### Local Process -> Vault

```ts
const ingress = await identity.startLocalSecretIngress({
  secretName: 'service-token',
});

await fetch(ingress.url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${ingress.authToken}`,
    'Content-Type': 'text/plain',
  },
  body: 'newly-issued-secret',
});
```

### Vault -> Remote Service

```ts
const response = await identity.fetchWithAuth('service-token', 'https://api.example.com/me');
```

### Vault -> Local Proof / Validation

```ts
const same = await identity.compareSecret('service-token', 'candidate-value');
const proof = await identity.proveSecret('service-token', 'challenge-123');
```

```ts
import { genericHttpValidator } from '@the-ai-company/cbio-node-runtime';

const result = await identity.validateSecret(
  'service-token',
  genericHttpValidator({
    url: 'https://api.example.com/me',
  }),
);
```

## Build

```bash
npm run build
npm run test
```
