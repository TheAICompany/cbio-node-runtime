# cbio Vault Runtime（中文文档）

cbio Vault Runtime 采用 **Vault（保险箱）** 架构：管理权限扎根于主密码，Agent 身份与机密材料由保险箱加密托管。

---

## 核心特性

- **库优先**：纯 JavaScript/TypeScript 库，无 CLI 或 TUI。
- **权限中心化**：管理权限绑定于保险箱主密码，而非外部身份密钥。
- **Agent 身份托管**：支持在保险箱内直接生成并加密存储 Agent 私钥。
- **Agent Session Token**：为 Agent 发放可撤销的 session token，避免在消费进程中持有原始私钥。默认内存实现中，每个 Agent 任意时刻只保留一个当前 token。
- **进程隔离**：安全进程（Security Process）与 Agent 进程（Consumer Process）物理分离。
- **零泄露发现**：保险箱元数据全加密，未解锁前对外部完全透明。

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
  vaultId: myVault.core.vaultId.value,
  password: 'your-secure-password'
});
```

### 3. GUI 的 Owner Session

对于 GUI 这类长生命周期进程，应该持有 `OwnerSession`，而不是长期缓存裸 `OwnerClient`。

`createOwnerClient(...)` 只负责基于当前 runtime 创建 owner client；它不应该跨 HMR、模块重载或 runtime 替换被长期复用。`OwnerSession` 会提供稳定的 SDK 句柄，并暴露清晰的读取方法。

```ts
import { openOwnerSession } from '@the-ai-company/cbio-node-runtime';

const session = openOwnerSession(storage, {
  vaultId: myVault.core.vaultId.value,
  password: 'your-secure-password',
});

const createdAgent = await session.withOwnerClient((client) =>
  client.ownerCreateAgent({ nickname: '后台处理插件' })
);

const ownerClient = await session.getOwnerClient();
const agents = await ownerClient.ownerListAgents();
// ownerListAgents() 会直接返回每个 agent 当前的 session_token

session.invalidate();
```

如果你写的是一次性脚本，`recoverVault(...)` 配合 `createOwnerClient(...)` 仍然是合适的。

### 4. 托管 Agent 身份

```ts
import { createOwnerClient } from '@the-ai-company/cbio-node-runtime';

const client = createOwnerClient({
  vault: vault.vault,
  passwordVerifier: vault.verifyPassword,
});

const createdAgent = await client.ownerCreateAgent({
  nickname: '后台处理插件',
});

const rootAgentId = createdAgent.agent.rootAgentId;
const sessionToken = createdAgent.sessionToken;
```

### 5. 机密与授权管理（Grant Model）

v1.65+ 采用了简化的 **Grant（授权）** 模型，通过白名单控制访问：

```ts
// 1. 创建机密（严格语义：别名重复则报错）
const record = await client.ownerCreateSecret({
  alias: 'api-token',
  plaintext: 'secret-value'
});

// 1b. 批量创建（原子性：全部成功或全部失败）
await client.ownerCreateSecret([
  { alias: 'stripe-key', plaintext: 'sk_test_...' },
  { alias: 'openai-key', plaintext: 'sk-proj-...' }
]);

// 2. 授权 Agent 使用该机密
await client.ownerGrantAgentSecret({
  rootAgentId,
  secretAlias: 'api-token',
});

// 3. 授权该机密可发送至的目标域名
await client.ownerGrantSecretDestination({
  secretAlias: 'api-token',
  siteId: 'api.example.com',
});
```

### 6. Agent 消费机密与自省

Agent 使用 `AgentClient` 进行操作，支持 **零配置（Zero-Configuration）** 自省：

```ts
import { createAgentClient } from '@the-ai-company/cbio-node-runtime';

const agent = createAgentClient({
  rootAgentIdentity: { rootAgentId },
  token: sessionToken.token,
  vault: vault.vault
});

// 执行机密驱动的请求
const result = await agent.agentDispatch({ 
  targetUrl: 'https://api.example.com/data',
  method: 'POST',
  reason: '同步业务数据' 
});

// 自省：查看自己的身份、权限和可用工具
const manifest = await agent.agentGetRuntimeManifest();
console.log(manifest.agent.nickname);
console.log(manifest.grants.agentSecrets); // 已获得的机密授权
```

### 7. 人机协同（HITL）与语义化审计

如果 Agent 尝试的请求未获授权，`agentDispatch` 会返回 `AWAITING_APPROVAL` 状态，进入人工审批流。

```ts
const unsubscribe = client.ownerOnPendingDispatch({
  onEvent: (event) => {
    console.log("pending dispatch", event.event_id, event.record.request_id);
  },
});

// 审批待处理的请求
const pending = await client.ownerListRequests({ root_agent_id: rootAgentId });
if (pending.length > 0) {
  await client.ownerApproveDispatch({
    request_id: pending[0].request_id,
    decision: "allow_and_grant", // 允许执行并自动补齐缺少的授权
  });
}

unsubscribe();

// 查看语义化审计日志
const logs = await client.ownerReadAudit({ 
  action: 'APPROVE_DISPATCH' // 使用业务感知的语义化动作进行查询
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
3. **语义化审计**：所有操作均记录为具有业务含义的动作（如 `APPROVE_DISPATCH`），而非底层技术术语。
4. **二元状态**：保险箱要么被解锁并可见，要么只是磁盘上一组加密碎片。
