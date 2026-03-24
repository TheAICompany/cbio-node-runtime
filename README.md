# cbio Vault Runtime

Node.js vault runtime with a **Sovereign Vault** architecture: authority is rooted in a master password, and agent identities are fully managed within the vault's encrypted storage.

**Source:** [https://github.com/TheAICompany/cbio-node-runtime](https://github.com/TheAICompany/cbio-node-runtime)

---

## Key Features

- **No CLI / No TUI**: Pure library for integration into Node.js applications.
- **Authority-centric**: Administrative control is tied to the vault's master password, not an external identity.
- **Managed Agent Custody**: Generate and store agent private keys securely inside the vault.
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
```

### 4. Secret Management (Owner)

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

// Grant the agent capability to use this secret
await client.grantCapability({
  capability: {
    vaultId: vault.vaultId,
    capabilityId: 'cap-1',
    agentId: 'worker-1',
    secretAliases: ['api-token'],
    operation: 'dispatch_http',
    allowedTargets: ['https://api.example.com/endpoint'],
    allowedMethods: ['POST'],
    issuedAt: new Date().toISOString()
  }
});
```

### 5. Consuming Secrets (Agent)

Agents run in isolated processes and communicate with the vault via a transport.

```ts
import { createAgentClient, LocalSigner } from '@the-ai-company/cbio-node-runtime';

const agent = createAgentClient({
  agentIdentity: { agentId: 'worker-1' },
  capability: myCapability, // Shared with the agent
  vault: vault.vault,       // Remote or local transport
  signer: new LocalSigner({ privateKey: agentPrivateKey })
});

const result = await agent.dispatch({
  secretAlias: 'api-token',
  targetUrl: 'https://api.example.com/endpoint',
  method: 'POST',
  body: '{"data": "..."}'
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

## Build & Test

```bash
npm run build
npm test
```
