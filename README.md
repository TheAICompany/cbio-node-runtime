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

const client = createVaultClient({
  vault: vault.vault,
  passwordVerifier: vault.verifyPassword
});

// Generate and register a new agent in one step
const createdAgent = await client.ownerCreateAgent({
  nickname: 'Background Worker'
});

const agentId = createdAgent.agent.agentId;
console.log(`Agent public key: ${createdAgent.agent.publicKey}`);
console.log(`Identity ID: ${createdAgent.agent.identityId}`);
const session = createdAgent.sessionToken;

// RECOMENDED (v1.48.4+): Batch issue tokens for all agents at once
const tokens = await client.ownerIssueAllSessionTokens();
```

### 5. Secret Management (Owner)

```ts
// Write a secret and bind it to a target site
const record = await client.ownerWriteSecret({
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
await client.ownerGrantCapability({
  agentId,
  secretAliases: ['api-token'],
  scope: 'https://api.example.com/*',
  methods: ['POST']
});

// 5. Setup client with automatic warmup (v1.48.4+)
const client = createVaultClient({
  vault,
  ownerIdentity: { identityId: 'owner-1' }
  // warmup: true is now DEFAULT (v1.48.4+)
  // skipWarmup: true // Optional: pass this to disable automatic token generation
});
```

### 6. Consuming Secrets (Agent)

Agents run in isolated processes and communicate with the vault via a transport. Agent execution now requires a **Session Token** issued by the owner.

#### Using a Session Token (Stateless/Token-based)
```ts
import { createAgentClient } from '@the-ai-company/cbio-node-runtime';

const agent = createAgentClient({
  agentIdentity: { agentId },
  capability: myCapability, 
  token: session.token,
  vault: vault.vault
});

const result = await agent.agentDispatch({ ... });
```

The agent process does not execute directly with its raw private key. If it has an identity key, it still needs to exchange that trust for a session token before dispatching.

### 7. Proactive Capability Requests

If an LLM or orchestration layer already knows it needs a broader scope, it can ask for that scope up front instead of triggering one pending dispatch per concrete URL.

```ts
const request = await client.ownerSubmitCapabilityRequest({
  requester: { kind: 'trusted_executor', id: 'llm-planner' },
  agentId,
  secretAliases: ['api-token'],
  scope: 'https://api.example.com/users/*',
  methods: ['GET'],
  justification: 'Need collection-level user read access'
});

const pendingRequests = await client.ownerListPendingCapabilityRequests();

const capability = await client.ownerApproveCapabilityRequest({
  requestId: pendingRequests[0].requestId,
  capabilityId: 'cap-users-read'
});
```

This flow is separate from dispatch discovery:
- `ownerSubmitCapabilityRequest(...)` creates a pending capability request for owner review.
- `ownerOnPendingCapabilityRequest(...)` pushes new requests to the owner UI or controller.
- `ownerApproveCapabilityRequest(...)` turns the request into a real stored capability.
- `ownerRejectCapabilityRequest(...)` drops the request without granting access.

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
const result = await agent.agentDispatch({ ... });
if (result.status === 'PENDING') {
  console.log("Discovery needed: Waiting for owner approval...");
}

// OR: Use the Observer for real-time push (v1.48.4+)
ownerClient.ownerOnPendingDispatch((req) => {
  console.log("New discovery request:", req.requestId);
});

// In Owner process (GUI or Script)
const pending = await client.ownerListPendingDispatches();
if (pending.length > 0) {
  // Inspect and approve the request, optionally making it permanent
  await client.ownerApproveDispatch({ 
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
// Sensitive plaintext reads require the vault password again
const plaintext = await client.ownerReadSecretPlaintext({
  alias: 'api-token',
  password: 'your-secure-password'
});
