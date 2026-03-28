# Process Isolation (A/B Architecture)

The `@the-ai-company/cbio-node-runtime` is designed to support a secure **Process Isolation** architecture, often referred to as an "A/B" or "Hub-and-Spoke" model.

Under this model, sensitive operations are split across two separate OS processes:

1.  **Process B (The Vault Server)**: Processes that hold the primary Vault Master Key and manage the encrypted storage. It acts as a protocol-aware proxy.
2.  **Process A (The Agent/LLM)**: Processes that perform business logic or LLM inference. They sign requests but **never possess the vault's secrets or master key**.

## Key Components

### `AgentDispatchHttpTransport` (Client-side)

This transport resides in **Process A**. It fulfills the `AgentDispatchTransport` interface but instead of calling a local vault, it serializes the signed request into a JSON payload and sends it to a remote endpoint via HTTP.

```typescript
import { createAgentClient, AgentDispatchHttpTransport } from '@the-ai-company/cbio-node-runtime';

const transport = new AgentDispatchHttpTransport('http://localhost:3000/dispatch');

const agent = createAgentClient({
  rootAgentIdentity, // Process A ONLY knows its own identity
  grant,    // Process A knows its granted permissions
  transport,
});

await agent.dispatch({
  secretAlias: 'api-token',
  targetUrl: 'https://api.example.com/data',
  method: 'POST',
});
```

### `handleVaultHttpDispatch` (Server-side)

This helper resides in **Process B**. It provides a standardized way to pass incoming HTTP request bodies to the `VaultService`. It handles the 100% JSON-safe `VaultAgentDispatchRequest` format.

```typescript
import { createVaultService, handleVaultHttpDispatch } from '@the-ai-company/cbio-node-runtime';

// In an Express/Fastify/Node.js HTTP server:
server.post('/dispatch', async (req, res) => {
  const result = await handleVaultHttpDispatch(vaultService, req.body);
  res.json(result);
});
```

## Security Benefits

- **Zero Secret Exposure**: Even if Process A (the LLM) is compromised via prompt injection or memory inspection, the attacker cannot extract the vault's secrets because they are physically located in Process B.
- **Controlled Egress**: Process B enforces the **Permission Table** (Capabilities). It only injects secrets into requests destined for owner-approved URLs.
- **Audit Traceability**: Process B maintains an independent, append-only audit log of every secret-backed request initiated by any Agent.

## Example

See [examples/process-isolation.ts](../examples/process-isolation.ts) for a complete working demonstration of this architecture.
