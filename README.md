# cbio Node Runtime

Node.js runtime for cbio identity and credential vault. Library only.

**⚠️ Actively under development — not a stable release.**

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
