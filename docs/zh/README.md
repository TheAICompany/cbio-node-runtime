# cbio Vault Runtime

cbio 权限核心运行时。仅库，无 CLI 或 TUI。

主入口现在围绕四个模块：
- `vault-core`
- `clients/owner`
- `clients/agent`
- `vault-ingress`

## 安装

```bash
npm install @the-ai-company/cbio-node-runtime
```

## 使用

```ts
import {
  createVaultService,
  createIdentity,
  createVault,
  recoverVault,
  LocalVaultTransport,
  createVaultClient,
  createAgentClient,
  FsStorageProvider,
} from '@the-ai-company/cbio-node-runtime';
```

## 架构

1. secret 明文只存在于 `vault-core`
2. `clients/owner` 负责 owner 写入、明文导出与审计读取
3. `clients/agent` 负责 agent 签名 dispatch 请求
4. `vault-ingress` 负责在 vault 边界内部处理 capability 解析与 dispatch ingress

推荐的持久化主路径：

- 通过 `createVault(...)` 创建持久化 vault
- 通过 `recoverVault(...)` 用 recovery key 恢复持久化 vault

## 构建

```bash
npm run build
npm run test
```
