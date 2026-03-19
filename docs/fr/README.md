# cbio Node Runtime

Runtime Node.js pour le coffre d'identité et de credentials cbio. Bibliothèque uniquement, pas de CLI ni TUI.

Importez et utilisez `CbioIdentity`, `CbioAgent` depuis l'export principal.

## Installation

```bash
npm install @the-ai-company/cbio-node-runtime
```

## Utilisation

```ts
import { CbioIdentity, generateIdentityKeys } from '@the-ai-company/cbio-node-runtime';

const keys = generateIdentityKeys();
const identity = await CbioIdentity.load({ privateKey: keys.privateKey });
```

## Compilation

```bash
npm run build
npm run test
```
