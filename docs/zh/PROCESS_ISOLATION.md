# 进程隔离 (A/B 架构)

`@the-ai-company/cbio-node-runtime` 原生支持**进程隔离**架构（通常被称为 "A/B" 或 "中枢控制" 模型）。

在此模型下，敏感操作被拆分到两个独立的操作系统进程中：

1.  **进程 B (Vault Server)**：持有 Vault 根密钥并管理加密存储。它作为一个“具备身份验证感知能力的代理服务器”运行。
2.  **进程 A (Agent/LLM)**：执行业务逻辑或大模型推理。它们可以**发起签名请求**，但**全程接触不到 Vault 的机密或根密钥**。

## 核心组件

### `AgentDispatchHttpTransport` (客户端)

此组件运行在 **进程 A** 中。它实现了 `AgentDispatchTransport` 接口，但不是调用本地 Vault，而是将带签名的请求序列化为 JSON 载荷，并通过 HTTP 发送到远程端点。

```typescript
import { createAgentClient, AgentDispatchHttpTransport } from '@the-ai-company/cbio-node-runtime';

// 进程 A 只需要知道远程 Vault 的 URL
const transport = new AgentDispatchHttpTransport('http://localhost:3000/dispatch');

const agent = createAgentClient({
  rootAgentIdentity, // 进程 A 仅持有自己的身份私钥
  grant,    // 进程 A 仅了解被授予的权限
  transport,
});

// A 进程请求代发，机密明文全程不进入 A 的内存
await agent.dispatch({
  secretAlias: 'api-token',
  targetUrl: 'https://api.example.com/data',
  method: 'POST',
});
```

### `handleVaultHttpDispatch` (服务端)

此辅助函数运行在 **进程 B** 中。它提供了将传入的 HTTP 请求体传递给 `VaultService` 的标准方法。它处理的是完全 JSON 安全的 `VaultAgentDispatchRequest` 格式。

```typescript
import { createVaultService, handleVaultHttpDispatch } from '@the-ai-company/cbio-node-runtime';

// 在任何 Node.js HTTP 服务器（如 Express/Fastify）中：
server.post('/dispatch', async (req, res) => {
  const result = await handleVaultHttpDispatch(vaultService, req.body);
  res.json(result);
});
```

## 安全优势

- **零机密暴露**：即使进程 A（如 LLM 进程）由于提示词注入（Prompt Injection）或内存检查被攻破，攻击者也无法提取 Vault 中的机密，因为它们物理上存储在进程 B 中。
- **受控出口面**：进程 B 强制执行 **权限表 (Capabilities)**。它只会在请求目的地匹配 Owner 预设的白名单 URL 时，才会注入机密并代发请求。
- **审计追踪**：进程 B 维护一份独立的、追加式审计日志，记录每个 Agent 发起的所有敏感请求。

## 示例

查看 [examples/process-isolation.ts](../examples/process-isolation.ts) 获取该架构的完整运行示例。
