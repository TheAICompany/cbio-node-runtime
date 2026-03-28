# cbio Vault Runtime

Runtime local de vault pour le noyau d'autorisation cbio. Il ne fournit ni CLI ni TUI.

Surface principale :
- `vault-core`
- `clients/owner`
- `clients/agent`
- `vault-ingress`

## Installation

```bash
npm install @the-ai-company/cbio-node-runtime
```

## Utilisation

```ts
import {
  createIdentity,
  createVault,
  listVaults,
  recoverVault,
  createOwnerSession,
  createOwnerClient,
  createAgentClient,
  FsStorageProvider,
} from '@the-ai-company/cbio-node-runtime';
```

## Architecture

1. Le plaintext du secret n'existe qu'a l'interieur de `vault-core`
2. `clients/owner` agit comme l'unique admin du vault : ecriture de secrets, export plaintext, administration des agents/capabilities et lecture de l'audit
3. `clients/agent` cree les requetes de dispatch signees par l'agent
4. `vault-ingress` resout les capabilities et traite l'ingress de dispatch a l'interieur de la frontiere de confiance du vault

Chemin principal recommande pour un vault persistant :

- créer le coffre persistant avec `createVault(...)`
- restaurer le coffre persistant avec `recoverVault(...)` via `vaultId` + `password`
- pour les GUIs ou processus longs, conserver `createOwnerSession(...)` plutôt qu'un `createOwnerClient(...)` brut en cache
- réserver `createOwnerClient(...)` aux scripts courts ou aux tâches ponctuelles dans le runtime courant

L'ancienne API centree sur `CbioIdentity` n'est plus la surface principale du produit.

## Build

```bash
npm run build
npm run test
```
