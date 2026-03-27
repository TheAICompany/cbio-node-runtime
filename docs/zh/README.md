# cbio Vault Runtime（中文文档）

cbio Vault Runtime 采用 **Sovereign Vault（主权保险箱）** 架构：管理权限扎根于主密码，Agent 身份与机密材料由保险箱加密托管。

---

## 核心特性

- **库优先**：纯 JavaScript/TypeScript 库，无 CLI 或 TUI。
- **权限中心化**：管理权限绑定于保险箱主密码，而非外部身份密钥。
- **Agent 身份托管**：支持在保险箱内直接生成并加密存储 Agent 私钥。
- **Agent Session Token**：为 Agent 发放可撤销的 session token，避免在消费进程中持有原始私钥。
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

对于 GUI 这类长生命周期进程，应该持有 `OwnerSession`，而不是长期缓存裸 `VaultClient`。

`createVaultClient(...)` 只负责基于当前 runtime 创建 owner client；它不应该跨 HMR、模块重载或 runtime 替换被长期复用。`OwnerSession` 会提供稳定的 SDK 句柄，并按需重新创建 owner client。

```ts
import { createOwnerSession } from '@the-ai-company/cbio-node-runtime';

const session = createOwnerSession(storage, {
  vaultId: myVault.core.vaultId.value,
  password: 'your-secure-password',
});

const createdAgent = await session.withClient((client) =>
  client.ownerCreateAgent({ nickname: '后台处理插件' })
);

const ownerClient = await session.client();
const agents = await ownerClient.ownerListAgents();
// ownerListAgents() 会直接返回每个 agent 当前的 sessionTokens

session.invalidate();
```

如果你写的是一次性脚本，`recoverVault(...)` 配合 `createVaultClient(...)` 仍然是合适的。

### 4. 托管 Agent 身份

```ts
import { createVaultClient } from '@the-ai-company/cbio-node-runtime';

const client = createVaultClient({
  vault: vault.vault,
  passwordVerifier: vault.verifyPassword,
});

const createdAgent = await client.ownerCreateAgent({
  nickname: '后台处理插件',
});

const agentId = createdAgent.agent.agentId;
const sessionToken = createdAgent.sessionToken;
```

### 5. 机密管理

```ts
const record = await client.ownerWriteSecret({
  alias: 'api-token',
  plaintext: 'secret-value'
});

await client.ownerGrantCapability({
  agentId,
  write: {
    secretIds: [record.secretId.value],
    scope: 'https://api.example.com/*',
    methods: ['POST']
  },
  read: { paths: ['$'] }
});
```

### 6. Agent 消费机密

```ts
import { createAgentClient } from '@the-ai-company/cbio-node-runtime';

const agent = createAgentClient({
  agentIdentity: { agentId },
  capability: myCapability,
  token: sessionToken.token,
  vault: vault.vault
});

const result = await agent.agentDispatch({ ... });
const requests = await agent.agentListRequests();
const request = await agent.agentGetRequest(result.requestId);
const ownerView = await client.ownerGetRequest({ requestId: result.requestId });
```

Agent 进程不会直接使用原始私钥执行请求。即使 Agent 拥有身份材料，也应先换取 session token，再进行 dispatch。

给 LLM 的直白规则：
- `agentDispatch(...)` = 立刻尝试执行真实任务
- `agentDispatch(...)` 必须带一条给 owner 看的 `reason`，说明为什么要发这个请求
- `agentSubmitCapabilityRequest(...)` = 只申请权限，不会执行任务
- `agentSubmitCapabilityRequest(...)` 也必须带 `reason`，说明为什么需要这项权限
- `agentListRequests()` / `agentGetRequest(...)` = 在请求执行后查看异步结果
- `ownerListRequests()` / `ownerGetRequest(...)` = owner 查看完整请求记录，用于决定是否放行 read
- `read.paths` 只控制哪些响应值可见；响应结构始终可见，`['$']` 表示整个 body 都可见

```ts
const manifest = await agent.agentIntrospect();

console.log(manifest.agent.agentId);
console.log(manifest.agent.identityId);
console.log(manifest.agent.nickname);
console.log(manifest.capabilities); // 同一组能力载体里包含 write/read 动作状态
```

`agentListCapabilities()` 返回能力载体视图，`agentListRequests()` / `agentGetRequest()` 则负责暴露请求历史和按权限裁剪后的结果。

### 7. 人机协同（HITL）工作流

如果 Agent 尝试执行的动作不在白名单内，dispatch 会返回 `PENDING`，同时运行时会写入一条能力载体记录，其 `write` 动作等待 Owner 审批。

```ts
const result = await agent.agentDispatch({ ... });
if (result.status === 'PENDING') {
  console.log('触发发现流程：等待所有者审批...');
}

client.ownerOnCapabilityState((state) => {
  if (state.writeGrant === null) {
    console.log('收到新的待审批能力状态:', state.requestId);
  }
});

const pending = await client.ownerListCapabilityStates({ writeGranted: false });
if (pending.length > 0) {
  await client.ownerAllowAlways({
    requestId: pending[0].requestId
  });
  await client.ownerApproveCapabilityRead({
    requestId: pending[0].requestId,
    read: { paths: ['data.id', 'data.status'] }
  });
}
```

---

## 详细文档

- [进程隔离（A/B 架构）](../PROCESS_ISOLATION.md)
- [根目录 README（英文）](../../README.md)

## 架构原则

1. **机密隔离**：机密明文绝不离开安全进程。
2. **密码即权限**：主密码是唯一的管理授权来源。
3. **可审计性**：所有管理动作均记录为 `vault-master` 或对应的 Agent 身份。
4. **二元状态**：保险箱要么被解锁并可见，要么只是磁盘上一组加密碎片。
