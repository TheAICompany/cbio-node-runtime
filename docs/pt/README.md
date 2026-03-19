# cbio Node Runtime

Runtime Node.js para cofre de identidade e credenciais cbio. Apenas biblioteca, sem CLI ou TUI.

Importe e use `CbioIdentity`, `CbioAgent` do export principal.

## Instalação

```bash
npm install @the-ai-company/cbio-node-runtime
```

## Uso

```ts
import { CbioIdentity, generateIdentityKeys } from '@the-ai-company/cbio-node-runtime';

const keys = generateIdentityKeys();
const identity = await CbioIdentity.load({ privateKey: keys.privateKey });
```

## Compilação

```bash
npm run build
npm run test
```
