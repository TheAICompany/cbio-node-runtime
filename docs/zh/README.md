# cbio Vault Runtime

cbio 权限核心运行时。仅库，无 CLI 或 TUI。

## 文档

- [进程隔离 (A/B 架构)](PROCESS_ISOLATION.md)
- [根目录文档](../../README.md)

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
  readIdentityPrivateVaultProfile,
  readIdentityMetadata,
  listIdentities,
  listVaults,
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
2. `clients/owner` 负责 owner 写入、明文导出、审计读取、以及 **Agent/权限管理**（`listAgents`, `listCapabilities`, `revokeCapability`）
3. `clients/agent` 负责 agent 签名 dispatch 请求
4. `vault-ingress` 负责在 vault 边界内部处理 capability 解析与 dispatch ingress

推荐的持久化主路径：

- 通过 `createVault(...)` 创建持久化 vault (支持 `publicMetadata` 用于公开发现)
- 通过 `recoverVault(...)` 用 owner 身份恢复持久化 vault
- 分区存储：`vaults/` (具名保险箱) 与 `identities/` (身份私有空间)
    - 所有公开元数据（如昵称）现在遵循 `VaultPublicMetadata` 接口，并附带**数字签名**。SDK 自动验证其真实性。

## 构建

```bash
npm run build
npm run test
```
