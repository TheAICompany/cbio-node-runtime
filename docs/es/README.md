# cbio Node Runtime

Runtime Node.js para caja de identidad y credenciales cbio. Solo biblioteca, sin CLI ni TUI.

Importa y usa `CbioIdentity`, `CbioAgent` desde el export principal.

## Instalación

```bash
npm install @the-ai-company/cbio-node-runtime
```

## Uso

```ts
import { CbioIdentity, generateIdentityKeys } from '@the-ai-company/cbio-node-runtime';

const keys = generateIdentityKeys();
const identity = await CbioIdentity.load({ privateKey: keys.privateKey });
```

## Compilación

```bash
npm run build
npm run test
```
