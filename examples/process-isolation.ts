import http from "node:http";
import {
  createIdentity,
  createVault,
  createAgentClient,
  createVaultService,
  handleVaultHttpDispatch,
  AgentDispatchHttpTransport,
  MemoryStorageProvider,
} from "../src/runtime/index.js";
import { LocalSigner } from "../src/protocol/crypto.js";

/**
 * This example demonstrates the A/B Process Architecture (Process Isolation).
 * 
 * - Process B (The Vault): Hosts the actual secrets and performs the HTTP dispatch.
 * - Process A (The Agent): Signs requests and sends them to Process B. A never sees the secret.
 */

// --- Process B: The Vault Server Logic ---
async function startVaultServer(port: number) {
  const ownerIdentity = createIdentity({ nickname: "vault-owner" });
  const storage = new MemoryStorageProvider();
  
  // Create a real vault in memory
  const { core } = await createVault(storage, {
    vaultId: "vault-isolated-server",
    ownerIdentity,
  });
  
  // Wrap as a Service
  const service = createVaultService((core as any)._deps); 

  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/dispatch") {
      let body = "";
      for await (const chunk of req) body += chunk;
      
      console.log("[Process B] Received dispatch request from Agent");
      
      try {
        const result = await handleVaultHttpDispatch(service, JSON.parse(body));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false, error: { code: "SERVER_ERROR", message } }));
      }
    } else {
      res.writeHead(404).end();
    }
  });

  return new Promise<{ server: http.Server; ownerIdentity: any; vault: any }>((resolve) => {
    server.listen(port, () => {
      console.log(`[Process B] Vault Server listening on port ${port}`);
      resolve({ server, ownerIdentity, vault: core });
    });
  });
}

// --- Process A: The LLM Agent Logic ---
async function runAgentDemo(port: number, agentIdentity: any, capability: any) {
  // Process A ONLY knows the remote URL and its own Agent Identity.
  // It has NO access to the Vault's master key or storage.
  const transport = new AgentDispatchHttpTransport(`http://localhost:${port}/dispatch`);
  
  const agentClient = createAgentClient({
    agentIdentity,
    capability,
    transport,
    signer: new LocalSigner(agentIdentity),
  });

  console.log("[Process A] LLM Agent requesting secret-backed dispatch...");
  
  try {
    const result = await agentClient.agentDispatch({
      secretAlias: "api-token",
      targetUrl: "https://httpbin.org/post",
      method: "POST",
      body: JSON.stringify({ message: "Hello from isolated Process A" }),
    });

    console.log("[Process A] Dispatch Result Status:", result.status);
    console.log("[Process A] (Secret was injected by Process B and never touched Process A's memory)");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Process A] Dispatch failed:", message);
  }
}

// --- Orchestration ---
async function main() {
  const PORT = 3456;
  
  // 1. Start the "Vault Server" (Process B)
  const { ownerIdentity, vault, server } = await startVaultServer(PORT);
  
  // 2. Setup: Owner (in Process B's context) grants permission to an Agent
  const agentIdentity = createIdentity({ nickname: "llm-agent-1" });
  
  // Owner registers the agent and a capability (simulated local call for setup)
  await vault.registerAgentIdentity({
    vaultId: vault.vaultId,
    owner: { kind: "owner", id: ownerIdentity.identityId },
    agentIdentity: {
      vaultId: vault.vaultId,
      agentId: agentIdentity.identityId,
      publicKey: agentIdentity.publicKey,
    },
    proof: { signature: "setup-proof", ownerId: ownerIdentity.identityId, requestedAt: new Date().toISOString() },
  });

  // Owner writes a secret (simulated local call for setup)
  const secret = await vault.ownerWriteSecret({
    kind: "owner.write_secret",
    vaultId: vault.vaultId,
    owner: { kind: "owner", id: ownerIdentity.identityId },
    alias: "api-token",
    plaintext: "SK-PROD-12345",
    targetBindings: [{ kind: "site", targetId: "httpbin.org", targetUrl: "https://httpbin.org/post", methods: ["POST"] }],
    requestedAt: new Date().toISOString(),
    proof: { signature: "setup-proof", ownerId: ownerIdentity.identityId, requestedAt: new Date().toISOString() },
  });

  const capability = {
    vaultId: vault.vaultId,
    capabilityId: "cap-llm-1",
    agentId: agentIdentity.identityId,
    secretIds: [secret.secretId.value],
    secretAliases: ["api-token"],
    operation: "dispatch_http" as const,
    scope: "https://httpbin.org/post",
    methods: ["POST"],
    issuedAt: new Date().toISOString(),
  };

  await vault.registerCapability({
    vaultId: vault.vaultId,
    owner: { kind: "owner", id: ownerIdentity.identityId },
    capability,
    proof: { signature: "setup-proof", ownerId: ownerIdentity.identityId, requestedAt: new Date().toISOString() },
  });

  // 3. Run the "LLM Agent" (Process A)
  await runAgentDemo(PORT, agentIdentity, capability);

  // 4. Cleanup
  server.close();
  console.log("Demo finished.");
}

main().catch(console.error);
