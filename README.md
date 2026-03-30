# cbio Vault Runtime (v1.72.0)

Node.js vault runtime with a **Vault** architecture: authority is rooted in a master password, and agent identities are fully managed within the vault's encrypted storage.

---

## Key Features

- **No CLI / No TUI**: Pure library for integration into Node.js applications.
- **Authority-centric**: Administrative control is tied to the vault's master password.
- **Unified ID Architecture**: All identifiers (VaultId, SecretId, AgentId) are managed as native strings.
- **Grant-Based Authorization**: Simplified, domain-level white-listing.
- **Zero-Configuration Discovery**: Agents can self-introspect to discover their identity, grants, and toolset.
- **Managed Agent Custody**: Generate and store agent private keys securely inside the vault.
- **Process Resilience**: Native support for memory-only fallback when SQLite is unavailable.

## Install

Requires Node >= 18.

```bash
npm install @the-ai-company/cbio-node-runtime
```

## Usage

### 1. Bootstrap and Recover

```ts
import { createVault, recoverVault, FsStorageProvider } from '@the-ai-company/cbio-node-runtime';

const storage = new FsStorageProvider('./my-vaults');

// Create
const myVault = await createVault(storage, {
  password: 'your-secure-password',
  nickname: 'Production Vault'
});

// Recover
const vault = await recoverVault(storage, {
  vault_id: myVault.vault_id,
  password: 'your-secure-password'
});
```

### 2. Manage Agents and Grants (Owner)

```ts
import { createOwnerClient } from '@the-ai-company/cbio-node-runtime';

const client = await createOwnerClient({
  vault: vault.vault,
  password_verifier: (pwd) => pwd === 'your-secure-password'
});

// 1. Create an agent
const { agent, session_token } = await client.ownerCreateAgent({ nickname: 'Bot' });

// 2. Create a secret (Strict Create: fails if alias exists)
const secret = await client.ownerCreateSecret({ alias: 'api-key', plaintext: 'sk-...' });

// 3. Grant access (Whitelist)
// Note: Grants are bound to the internal stable ID, so renames are resilient.
await client.ownerGrantAgentSecret({ root_agent_id: agent.root_agent_id, secret_alias: 'api-key' });
await client.ownerGrantSecretDestination({ secret_alias: 'api-key', site_id: 'api.openai.com' });
```

### 3. Dispatch Secrets (Agent)

Agents use a "Zero-Configuration" workflow. They don't need to know their permissions up front; the system guides them.

```ts
import { createAgentClient } from '@the-ai-company/cbio-node-runtime';

const agentClient = createAgentClient({
  agentRecord: agent,
  token: session_token.token,
  vault: vault.vault
});

// Dispatch request
const result = await agentClient.agentDispatch({
  target_url: 'https://api.openai.com/v1/chat/completions',
  method: 'POST',
  secret_alias: 'api-key',
  reason: 'Processing user request'
});

if (result.status === 'PENDING') {
  console.log("Stalled for HITL approval. Request ID:", result.request_id);
}
```

### 4. Human-in-the-Loop (Owner Approval)

If a dispatch is blocked (status `AWAITING_APPROVAL`), the owner can review stored request records or subscribe to pending-dispatch events:

```ts
const unsubscribe = client.ownerOnPendingDispatch({
  onEvent: (event) => {
    console.log("pending dispatch", event.event_id, event.record.request_id);
  },
});

const pending = await client.ownerListRequests();
const awaitingApproval = pending.filter((record) => record.execution.status === "AWAITING_APPROVAL");

// Approve with the "Allow & Grant" shortcut
if (awaitingApproval.length > 0) {
  await client.ownerApproveDispatch({
    request_id: awaitingApproval[0].request_id,
    decision: "allow_and_grant",
  });
}

unsubscribe();
```

### 5. Fact-Based Audit Log

The audit log records objective facts about function calls and results. You can stream the log over SSE:

```ts
import { handleVaultAuditSse } from '@the-ai-company/cbio-node-runtime';

app.get('/api/events', (req, res) => {
  const response = handleVaultAuditSse(vaultService, {
    afterEventId: req.header('Last-Event-ID') ?? undefined,
    signal: req.signal,
  });
  // ... bridge to SSE response
});
```

Decisions can be:
- `allow_once`: Execute once, no permanent whitelist update.
- `allow_and_grant`: Execute and add to the permanent whitelist (Zero-Config).
- `deny`: Reject the request.

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Deep dive into the Vault model.
- [Reference](docs/REFERENCE.md) - API surface and type definitions.
- [Migration Guide](docs/MIGRATION-1.65.md) - Moving from v1.4x (Capabilities) to v1.65 (Grants).
