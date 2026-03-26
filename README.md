# cbio Vault Runtime

Node.js vault runtime with a **Sovereign Vault** architecture: authority is rooted in a master password, and agent identities are fully managed within the vault's encrypted storage.

**Source:** [https://github.com/TheAICompany/cbio-node-runtime](https://github.com/TheAICompany/cbio-node-runtime)

---

## Key Features

- **No CLI / No TUI**: Pure library for integration into Node.js applications.
- **Authority-centric**: Administrative control is tied to the vault's master password, not an external identity.
- **Managed Agent Custody**: Generate and store agent private keys securely inside the vault.
- **Agent Session Tokens**: Issue revocable, short-lived (or long-lived) tokens for agents to avoid handling raw private keys.
- **Process Isolation**: Hard separation between the Security Process (Master) and Agent Processes (Consumers).
- **Zero-Leak Discovery**: Vault metadata is fully encrypted and hidden until unlocked.

## Install

Requires Node >= 18.

```bash
npm install @the-ai-company/cbio-node-runtime
```

## Usage

### 1. Bootstrap a New Vault

The Sovereign Vault requires only a storage provider and a master password.

```ts
import { 
  createVault, 
  FsStorageProvider, 
  createWorkspaceStorage 
} from '@the-ai-company/cbio-node-runtime';

const storage = new FsStorageProvider('./my-vaults');

const myVault = await createVault(storage, {
  vaultId: 'main-vault',
  password: 'your-secure-password',
  nickname: 'Production Vault'
});

console.log(`Vault created: ${myVault.nickname}`);
```

### 2. Recover an Existing Vault

```ts
import { recoverVault, FsStorageProvider } from '@the-ai-company/cbio-node-runtime';

const vault = await recoverVault(storage, {
  vaultId: 'main-vault',
  password: 'your-secure-password'
});
```

### 3. Managed Agent Identities

You can generate and register agents directly within the vault. The vault holds the private keys for full custody.

```ts
import { createVaultClient } from '@the-ai-company/cbio-node-runtime';

const client = createVaultClient({ vault: vault.vault });

// Generate and register a new agent in one step
const [agentRecord, agentPrivateKey] = await client.createAgent({
  agentId: 'worker-1',
  nickname: 'Background Worker'
});

console.log(`Agent public key: ${agentRecord.publicKey}`);
// Private key is returned during creation and stored securely in the vault.

// 4. Issue a Session Token (Optional but Recommended)
// Avoid passing the raw private key to agent processes.
const session = await client.issueSessionToken({ agentId: 'worker-1' });
console.log(`Session Token: ${session.token}`);
```

### 5. Secret Management (Owner)

```ts
// Write a secret and bind it to a target site
const record = await client.writeSecret({
  alias: 'api-token',
  plaintext: 'super-secret-value',
  targetBindings: [{
    kind: 'site',
    targetId: 'my-api',
    targetUrl: 'https://api.example.com/endpoint',
    methods: ['POST']
  }]
});

// 4. Grant agent capabilities
await client.grantCapability({
  agentId: 'worker-1',
  secretAliases: ['api-token'],
  allowedTargets: ['https://api.example.com/*'],
  skipAudit: false // Optional, defaults to false
});
```

### 6. Consuming Secrets (Agent)

Agents run in isolated processes and communicate with the vault via a transport. They can use either a **Session Token** (recommended) or a **Signature** (raw private key).

#### Using a Session Token (Stateless/Token-based)
```ts
import { createAgentClient } from '@the-ai-company/cbio-node-runtime';

const agent = createAgentClient({
  agentIdentity: { agentId: 'worker-1' },
  capability: myCapability, 
  token: session.token,     // Issued by the owner
  vault: vault.vault
});

const result = await agent.dispatch({ ... });
```

#### Using a Signature (Stateful/Key-based)
```ts
import { createAgentClient, LocalSigner } from '@the-ai-company/cbio-node-runtime';

const agent = createAgentClient({
  agentIdentity: { agentId: 'worker-1' },
  capability: myCapability,
  signer: new LocalSigner({ privateKey: agentPrivateKey }),
  vault: vault.vault
});
```

---

## Documentation

- [Custody Model](docs/CUSTODY_MODEL.md) - Understanding managed agency and key storage.
- [Process Isolation](docs/PROCESS_ISOLATION.md) - Guidelines for A/B architecture.

## Architecture Rules

1. **Secret Isolation**: Plane-text secrets never leave the Security Process.
2. **Authority Root**: The master password is the only source of administrative authority.
3. **Auditability**: Every administrative and agent action is recorded in the vault's audit log under the `vault-master` or agent principal.
4. **Binary Discovery**: Either the vault is unlocked and visible, or it is a silent directory of encrypted shards.

### Human-in-the-Loop (HITL) Workflow

The system uses a **Discovery-first** model. If an agent attempts an action not explicitly in its white-list (the "Iron Triangle" of Agent-Key-Action), the dispatch is paused:

```ts
// In Agent process
const result = await agent.dispatch({ ... });
if (result.status === 'PENDING') {
  console.log("Discovery needed: Waiting for owner approval...");
}

// In Owner process (GUI or Script)
const pending = await client.listPendingDispatches();
if (pending.length > 0) {
  // Inspect and approve the request, optionally making it permanent
  await client.approveDispatch({ 
    requestId: pending[0].requestId, 
    permanent: true 
  });
}
```

## Build & Test

```bash
npm run build
npm test
```
