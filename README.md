# cbio Node Runtime

Node.js runtime for cbio identity and credential vault. Library only.

- No CLI
- No TUI

Import and use `CbioIdentity`, `CbioAgent` from the main export.

## Install

```bash
npm install @the-ai-company/cbio-node-runtime
```

## Usage

```ts
import { CbioIdentity, generateIdentityKeys } from '@the-ai-company/cbio-node-runtime';

const keys = generateIdentityKeys();
const identity = await CbioIdentity.load({ privateKey: keys.privateKey });
```

## Build

```bash
npm run build
npm run test
```
