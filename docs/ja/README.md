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
  createIdentity,
  createVault,
  listVaults,
  recoverVault,
  createOwnerSession,
  createVaultClient,
  createAgentClient,
  FsStorageProvider,
} from '@the-ai-company/cbio-node-runtime';
```

## アーキテクチャ

1. secret の平文は `vault-core` の内部にのみ存在します
2. `clients/owner` は、オーナーによる書き込み、平文エクスポート、監査の読み取り、および **Agent/権限管理** (`listAgents`, `listCapabilities`, `revokeCapability`) を担当します。
3. `clients/agent` は agent の signed dispatch request を作ります
4. `vault-ingress` は vault 境界の内側で capability 解決と dispatch ingress を扱います

推奨される persistent-vault の主経路:

- `createVault(...)` で persistent vault を作成する
- `recoverVault(...)` で `vaultId` と `password` を使って persistent vault を復旧する
- GUI や長寿命プロセスでは、生の `createVaultClient(...)` をキャッシュせず `createOwnerSession(...)` を保持する
- `createVaultClient(...)` は短命スクリプトやその runtime 限定の単発処理に使う

旧 `CbioIdentity` 中心 API は、もはや主要な公開面ではありません。

## ビルド

```bash
npm run build
npm run test
```
