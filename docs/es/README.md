# cbio Vault Runtime

Runtime local de vault para el nucleo de autorizacion de cbio. No incluye CLI ni TUI.

Superficie principal:
- `vault-core`
- `clients/owner`
- `clients/agent`
- `vault-ingress`

## Instalacion

```bash
npm install @the-ai-company/cbio-node-runtime
```

## Uso

```ts
import {
  createVaultService,
  createIdentity,
  readIdentityMetadata,
   createVault,
  recoverVault,
  LocalVaultTransport,
  createVaultClient,
  createAgentClient,
  FsStorageProvider,
} from '@the-ai-company/cbio-node-runtime';
```

## Arquitectura

1. El plaintext del secret existe solo dentro de `vault-core`
2. `clients/owner` actua como el unico admin del vault: escribe secrets, exporta plaintext, administra agents/capabilities y lee audit
3. `clients/agent` crea solicitudes de dispatch firmadas por el agent
4. `vault-ingress` resuelve capabilities y maneja el ingress de dispatch dentro del limite de confianza del vault

Ruta principal recomendada para vault persistente:

- crear el vault persistente con `createVault(...)` (soporta `publicMetadata` para el descubrimiento de información pública)
- recuperar el vault persistente con `recoverVault(...)` usando la identidad del owner
- Capas de almacenamiento divididas: `vaults/` (Bóvedas con nombre) e `identities/` (Espacio de identidad personal)

La API antigua centrada en `CbioIdentity` ya no es la superficie principal del producto.

## Build

```bash
npm run build
npm run test
```
