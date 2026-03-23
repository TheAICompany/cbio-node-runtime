# cbio Vault Runtime

Runtime local de vault para o nucleo de autorizacao do cbio. Nao inclui CLI nem TUI.

Superficie principal:
- `vault-core`
- `clients/owner`
- `clients/agent`
- `vault-ingress`

## Instalacao

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
  listIdentities,
  listVaults,
  recoverVault,
  LocalVaultTransport,
  createVaultClient,
  createAgentClient,
  FsStorageProvider,
} from '@the-ai-company/cbio-node-runtime';
```

## Arquitetura

1. O plaintext do secret existe apenas dentro de `vault-core`
2. `clients/owner` atua como o unico admin do vault: escreve secrets, exporta plaintext, administra agents/capabilities e le audit
3. `clients/agent` cria requisicoes de dispatch assinadas pelo agent
4. `vault-ingress` resolve capabilities e trata o ingress de dispatch dentro do limite de confianca do vault

Caminho principal recomendado para vault persistente:

- criar o cofre persistente com `createVault(...)` (suporta `publicMetadata` para a descoberta de informações públicas)
- recuperar o cofre persistente com `recoverVault(...)` usando a identidade do owner
- Camadas de armazenamento divididas: `vaults/` (Cofres nomeados) e `identities/` (Espaço de identidade pessoal)
    - Todos os metadados públicos (como o apelido) agora seguem a interface `VaultPublicMetadata` e incluem uma **assinatura digital**, que o SDK verifica automaticamente.

A antiga API centrada em `CbioIdentity` nao e mais a superficie principal do produto.

## Build

```bash
npm run build
npm run test
```
