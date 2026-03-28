# cbio Vault Runtime (v1.63.8)

Node.js vault runtime with a **Vault** architecture: authority is rooted in a master password, and agent identities are fully managed within the vault's encrypted storage.

**Source:** [https://github.com/TheAICompany/cbio-node-runtime](https://github.com/TheAICompany/cbio-node-runtime)

---

## Key Features

- **No CLI / No TUI**: Pure library for integration into Node.js applications.
- **Authority-centric**: Administrative control is tied to the vault's master password.
- **Grant-Based Authorization**: Simplified, domain-level white-listing replaced the legacy grant model.
- **Zero-Configuration Discovery**: Agents can self-introspect to discover their identity, grants, and toolset.
- **Managed Agent Custody**: Generate and store agent private keys securely inside the vault.
- **Process Isolation**: Hard separation between the Security Process (Master) and Agent Processes (Consumers).

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
  vaultId: myVault.core.vaultId.value,
  password: 'your-secure-password'
});
```

### 2. Manage Agents and Grants (Owner)

```ts
import { createOwnerClient } from '@the-ai-company/cbio-node-runtime';

const client = createOwnerClient({
  vault: vault.vault,
  passwordVerifier: vault.verifyPassword
});

// 1. Create an agent
const { agent, sessionToken } = await client.ownerCreateAgent({ nickname: 'Bot' });

// 2. Create a secret (Strict Create: fails if alias exists)
const secret = await client.ownerCreateSecret({ alias: 'api-key', plaintext: 'sk-...' });

// 2b. Batch Create (Atomic: all-or-nothing)
await client.ownerCreateSecret([
  { alias: 'stripe-key', plaintext: 'sk_test_...' },
  { alias: 'openai-key', plaintext: 'sk-proj-...' }
]);

// 3. Grant access (Whitelist)
await client.ownerGrantAgentSecret({ rootAgentId: agent.rootAgentId, secretAlias: 'api-key' });
await client.ownerGrantSecretDestination({ secretAlias: 'api-key', siteId: 'api.openai.com' });
```

### 3. Dispatch Secrets (Agent)

Agents use a "Zero-Configuration" workflow. They don't need to know their permissions up front; the system guides them.

```ts
import { createAgentClient } from '@the-ai-company/cbio-node-runtime';

const agentClient = createAgentClient({
  rootAgentIdentity: agent,
  token: sessionToken.token,
  vault: vault.vault
});

// Dispatch request
const result = await agentClient.agentDispatch({
  targetUrl: 'https://api.openai.com/v1/chat/completions',
  method: 'POST',
  secretAlias: 'api-key',
  reason: 'Processing user request'
});

if (result.status === 'PENDING') {
  console.log("Stalled for HITL approval. Request ID:", result.requestId);
}
```

### 4. Human-in-the-Loop (Owner Approval)

If a dispatch is blocked (status `PENDING`), the owner reviews the request record:

```ts
// List pending requests
const pending = await client.ownerListRequests({ status: 'PENDING' });

// Approve with the "Allow & Grant" shortcut
await client.ownerApproveDispatch({
  requestId: pending[0].requestId,
  decision: 'allow_and_grant' // Approves THIS request AND provisions permanent grants
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
