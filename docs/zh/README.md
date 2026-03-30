# cbio Vault Runtime（中文文档 v1.72.0）

cbio Vault Runtime 采用 **Vault（保险箱）** 架构：管理权限扎根于主密码，Agent 身份与机密材料由保险箱加密托管。

---

## 核心特性

- **库优先**：纯 JavaScript/TypeScript 库，无 CLI 或 TUI。
- **权限中心化**：管理权限绑定于保险箱主密码，而非外部身份密钥。
- **统一 ID 架构**：所有标识符（VaultId, SecretId, AgentId）均采用原生字符串管理。
- **Agent 身份托管**：支持在保险箱内直接生成并加密存储 Agent 私钥。
- **Agent Session Token**：为 Agent 发放可撤销的 session token。
- **环境韧性**：原生支持在无法使用 SQLite 的环境下自动回退至内存模式。

## 安装

需要 Node.js >= 18。

```bash
npm install @the-ai-company/cbio-node-runtime
```

## 使用指南

### 1. 初始化保险箱

```ts
import { createVault, FsStorageProvider } from '@the-ai-company/cbio-node-runtime';

const storage = new FsStorageProvider('./my-vaults');

const myVault = await createVault(storage, {
  password: 'your-secure-password',
  nickname: '生产环境保险箱'
});
```

### 2. 恢复已存在的保险箱

```ts
import { recoverVault } from '@the-ai-company/cbio-node-runtime';

const vault = await recoverVault(storage, {
  vault_id: myVault.vault_id,
  password: 'your-secure-password'
});
```

### 3. 托管 Agent 身份

```ts
import { createOwnerClient } from '@the-ai-company/cbio-node-runtime';

const client = await createOwnerClient({
  vault: vault.vault,
  password_verifier: (pwd) => pwd === 'your-secure-password',
});

const { agent, session_token } = await client.ownerCreateAgent({
  nickname: '后台处理插件',
});

const root_agent_id = agent.root_agent_id;
```

### 4. 机密与授权管理（Grant Model）

v1.65+ 采用了简化的 **Grant（授权）** 模型，通过白名单控制访问：

```ts
// 1. 创建机密（严格语义：别名重复则报错）
const record = await client.ownerCreateSecret({
  alias: 'api-token',
  plaintext: 'secret-value'
});

// 2. 授权 Agent 使用该机密
await client.ownerGrantAgentSecret({
  root_agent_id,
  secret_alias: 'api-token',
});

// 3. 授权该机密可发送至的目标域名
await client.ownerGrantSecretDestination({
  secret_alias: 'api-token',
  site_id: 'api.example.com',
});
```

### 5. Agent 消费机密与自省

Agent 使用 `AgentClient` 进行操作，支持 **零配置（Zero-Configuration）** 自省：

```ts
import { createAgentClient } from '@the-ai-company/cbio-node-runtime';

const agentClient = createAgentClient({
  agentRecord: agent,
  token: session_token.token,
  vault: vault.vault
});

// 执行机密驱动的请求
const result = await agentClient.agentDispatch({ 
  target_url: 'https://api.example.com/data',
  method: 'POST',
  reason: '同步业务数据' 
});

// 自省：查看自己的身份、权限和可用工具
const manifest = await agentClient.agentIntrospect();
console.log(manifest.nickname);
```

### 6. 人机协同（HITL）与事实审计

如果 Agent 尝试的请求未获授权，`agentDispatch` 会返回 `AWAITING_APPROVAL` 状态，进入人工审批流。

```ts
const unsubscribe = client.ownerOnPendingDispatch({
  onEvent: (event) => {
    console.log("pending dispatch", event.event_id, event.record.request_id);
  },
});

// 审批待处理的请求
const pending = await client.ownerListRequests();
const awaitingApproval = pending.filter(r => r.execution.status === "AWAITING_APPROVAL");

if (awaitingApproval.length > 0) {
  await client.ownerApproveDispatch({
    request_id: awaitingApproval[0].request_id,
    decision: "allow_and_grant", // 允许执行并自动补齐缺少的授权
  });
}

unsubscribe();

// 查看基于事实的审计日志
const logs = await client.ownerReadAudit({ 
  query: { root_agent_id } 
});
```

---

## 详细文档

- [迁移指南 (v1.4 -> v1.65)](../MIGRATION-1.65.md)
- [进程隔离（A/B 架构）](../PROCESS_ISOLATION.md)
- [根目录 README（英文）](../../README.md)

## 架构原则

1. **机密隔离**：机密明文绝不离开安全进程。
2. **密码即权限**：主密码是唯一的管理授权来源。
3. **基于事实的审计**：记录具体的函数调用与参数（如 `ownerApproveDispatch`），而非模糊的分类。
4. **统一 ID 架构**：全系统采用 raw string ID，消除冗余包装。
