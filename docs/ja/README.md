# cbio Vault Runtime

cbio 権限コアのローカル vault ランタイムです。CLI や TUI は含みません。

主な公開モジュール:
- `vault-core`
- `clients/owner`
- `clients/agent`
- `vault-ingress`

## インストール

```bash
npm install @the-ai-company/cbio-node-runtime
```

## 使い方

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

## アーキテクチャ

1. secret の平文は `vault-core` の内部にのみ存在します
2. `clients/owner` は単一の vault admin として secret 書き込み、平文 export、agent/capability 管理、audit 読み取りを行います
3. `clients/agent` は agent の signed dispatch request を作ります
4. `vault-ingress` は vault 境界の内側で capability 解決と dispatch ingress を扱います

推奨される persistent-vault の主経路:

- `createVault(...)` で persistent vault を作成する (`publicMetadata` による公開情報のディスカバリをサポート)
- `recoverVault(...)` で owner identity を使って persistent vault を復旧する
- 分離されたストレージ層: `vaults/` (具名 Vault) と `identities/` (個人 ID スペース)

旧 `CbioIdentity` 中心 API は、もはや主要な公開面ではありません。

## ビルド

```bash
npm run build
npm run test
```
