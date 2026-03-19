# cbio Node Runtime

cbio 身份与凭证保险库的 Node.js 运行时。仅库，无 CLI 或 TUI。

从主入口导入并使用 `CbioIdentity`、`CbioAgent`。

## 安装

```bash
npm install @the-ai-company/cbio-node-runtime
```

## 使用

```ts
import { CbioIdentity, generateIdentityKeys } from '@the-ai-company/cbio-node-runtime';

const keys = generateIdentityKeys();
const identity = await CbioIdentity.load({ privateKey: keys.privateKey });
```

## 构建

```bash
npm run build
npm run test
```
