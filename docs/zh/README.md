# cbio Vault Runtime (中文文档)

cbio 权限核心运行时：采用 **Sovereign Vault（主权保险箱）** 架构。管理权限扎根于主密码，Agent 身份完全由保险箱加密存储托管。

---

## 核心特性

- **库优先**：纯 JavaScript/TypeScript 库，无 CLI 或 TUI。
- **权限中心化**：管理权限绑定于保险箱主密码，而非外部身份密钥。
- **Agent 身份托管**：支持在保险箱内直接生成并加密存储 Agent 私钥。
- **进程隔离**：安全进程（Security Process - 掌管主密码）与 Agent 进程（Consumer Process - 消费机密）的物理分离。
- **零泄露发现**：保险箱元数据全加密，未解锁前对外部完全透明。

## 安装

需要 Node.js >= 18。

```bash
npm install @the-ai-company/cbio-node-runtime
```

## 使用指南

### 1. 初始化保险箱

主权保险箱仅需存储提供者（Storage Provider）和主密码。

```ts
import { createVault, FsStorageProvider } from '@the-ai-company/cbio-node-runtime';

const storage = new FsStorageProvider('./my-vaults');

const myVault = await createVault(storage, {
  vaultId: 'main-vault',
  password: 'your-secure-password',
  nickname: '生产环境保险箱'
});
```

### 2. 托管 Agent 身份

你可以直接在保险箱内创建 Agent，私钥将由保险箱全程托管。

```ts
import { createVaultClient } from '@the-ai-company/cbio-node-runtime';

const client = createVaultClient({ vault: myVault.vault });

// 一键生成并注册 Agent
const [agentRecord, agentPrivateKey] = await client.createAgent({
  agentId: 'worker-1',
  nickname: '后台处理插件'
});
```

### 3. 机密管理

```ts
// 写入机密并绑定目标
const record = await client.writeSecret({
  alias: 'api-token',
  plaintext: 'secret-value',
  targetBindings: [{
    kind: 'site',
    targetId: 'my-api',
    targetUrl: 'https://api.example.com/endpoint',
    methods: ['POST']
  }]
});
```

---

## 详细详细文档

- [进程隔离 (A/B 架构)](../PROCESS_ISOLATION.md)
- [根目录 README (英文)](../../README.md)

## 架构原则

1. **机密隔离**：机密明文绝不离开安全进程。
2. **密码即权限**：主密码是唯一的管理授权来源。
3. **可审计性**：所有管理动作在高层均记录为 `vault-master` 身份。
4. **二元状态**：保险箱要么被解锁并可见，要么是磁盘上一堆加密的碎片。
