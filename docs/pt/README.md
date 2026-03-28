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

## Arquitetura

1. O plaintext do secret existe apenas dentro de `vault-core`
2. `clients/owner` atua como o unico admin do vault: escreve secrets, exporta plaintext, administra agents/capabilities e le audit
3. `clients/agent` cria requisicoes de dispatch assinadas pelo agent
4. `vault-ingress` resolve capabilities e trata o ingress de dispatch dentro do limite de confianca do vault

Caminho principal recomendado para vault persistente:

- criar o cofre persistente com `createVault(...)`
- recuperar o cofre persistente com `recoverVault(...)` usando `vaultId` + `password`
- para GUIs ou processos longos, manter `createOwnerSession(...)` em vez de cachear um `createOwnerClient(...)` bruto
- usar `createOwnerClient(...)` apenas para scripts curtos ou tarefas pontuais no runtime atual

A antiga API centrada em `CbioIdentity` nao e mais a superficie principal do produto.

## Build

```bash
npm run build
npm run test
```
