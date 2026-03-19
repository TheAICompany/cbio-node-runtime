# cbio Node Runtime

cbio アイデンティティと credential vault の Node.js ランタイム。ライブラリのみ、CLI / TUI なし。

メインエクスポートから `CbioIdentity`、`CbioAgent` をインポートして使用。

## インストール

```bash
npm install @the-ai-company/cbio-node-runtime
```

## 使用例

```ts
import { CbioIdentity, generateIdentityKeys } from '@the-ai-company/cbio-node-runtime';

const keys = generateIdentityKeys();
const identity = await CbioIdentity.load({ privateKey: keys.privateKey });
```

## ビルド

```bash
npm run build
npm run test
```
