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

/**
 * This example demonstrates the A/B Process Architecture (Process Isolation).
 * 
 * - Process B (The Vault): Hosts the actual secrets and performs the HTTP dispatch.
 * - Process A (The Agent): Uses a session token to call Process B. A never sees the secret.
 */

// --- Process B: The Vault Server Logic ---
async function startVaultServer(port: number) {
  const ownerIdentity = createIdentity({ nickname: "vault-owner" });
  const storage = new MemoryStorageProvider();
  
  // Create a real vault in memory
  const { core } = await createVault(storage, {
    password: "process-isolation-demo-password",
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
async function runAgentDemo(port: number, agentIdentity: any, token: string) {
  // Process A ONLY knows the remote URL and its own Agent Identity.
  // It has NO access to the Vault's master key or storage.
  const transport = new AgentDispatchHttpTransport(`http://localhost:${port}/dispatch`);
  
  const agentClient = createAgentClient({
    agentIdentity,
    transport,
    token,
  });

  console.log("[Process A] LLM Agent requesting secret-backed dispatch...");
  
  try {
    const result = await agentClient.agentDispatch({
      secretAlias: "api-token",
      targetUrl: "https://httpbin.org/post",
      method: "POST",
      reason: "LLM agent needs to perform isolated dispatch",
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
  await vault.ownerRegisterAgentIdentity({
    vaultId: vault.vaultId,
    requestId: `setup:${Date.now()}:register_agent`,
    owner: { kind: "owner", id: ownerIdentity.rootAgentId },
    agentIdentity: {
      vaultId: vault.vaultId,
      agentId: agentIdentity.rootAgentId,
      publicKey: agentIdentity.publicKey,
    },
    requestedAt: new Date().toISOString(),
  });

  // Owner writes a secret (simulated local call for setup)
  const secret = await vault.ownerCreateSecret({
    kind: "owner.create_secret",
    vaultId: vault.vaultId,
    requestId: `setup:${Date.now()}:write_secret`,
    owner: { kind: "owner", id: ownerIdentity.rootAgentId },
    alias: "api-token",
    plaintext: "SK-PROD-12345",
    source: { kind: "manual" },
    requestedAt: new Date().toISOString(),
  });

  // Owner grants permissions (New Grant-based API)
  await vault.ownerGrantAgentSecret(
    { kind: "owner", id: ownerIdentity.rootAgentId },
    agentIdentity.rootAgentId,
    "api-token"
  );

  await vault.ownerGrantSecretDestination(
    { kind: "owner", id: ownerIdentity.rootAgentId },
    "api-token",
    "httpbin.org"
  );

  const session = await vault.ownerIssueSessionToken({
    vaultId: vault.vaultId,
    requestId: `setup:${Date.now()}:issue_session_token`,
    actor: { kind: "owner", id: ownerIdentity.rootAgentId },
    agentId: agentIdentity.rootAgentId,
    requestedAt: new Date().toISOString(),
  });

  // 3. Run the "LLM Agent" (Process A)
  await runAgentDemo(PORT, agentIdentity, session.token);

  // 4. Cleanup
  server.close();
  console.log("Demo finished.");
}

main().catch(console.error);
