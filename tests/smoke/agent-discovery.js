import { createVault, createVaultClient, createAgentClient, MemoryStorageProvider } from "../../src/runtime/index.js";
import assert from "node:assert";

/**
 * Smoke Test: Agent Introspection & Discovery (v1.65.0 - Grant-based)
 * Verifies that an agent can self-discover its identity, grants, and tools.
 */
async function runDiscoveryTest() {
  console.log("🚀 Starting Agent Discovery Smoke Test...");

  // 1. Setup Vault
  const { vault } = await createVault(new MemoryStorageProvider(), {
    nickname: "Discovery Test Vault",
    password: "master-password",
  });

  // 2. Setup Owner Client
  const ownerClient = createVaultClient({
    vault,
    ownerIdentity: { identityId: "owner-1" },
  });

  // 3. Create Agent
  const { agent, sessionToken } = await ownerClient.ownerCreateAgent({
    nickname: "Discovery-Bot",
  });

  // 4. Setup Agent Client (No capability needed anymore)
  const agentClient = createAgentClient({
    agentIdentity: agent,
    vault,
    token: sessionToken.token,
  });

  console.log("🔍 Introspecting...");
  const manifest = await agentClient.agentIntrospect();

  console.log("Agent ID:", manifest.agentId);
  console.log("Vault ID:", manifest.vaultId);
  console.log("Tools Count:", manifest.tools.length);

  assert.strictEqual(manifest.agentId, agent.agentId, "Agent ID mismatch");
  assert.ok(manifest.tools.length >= 4, "Should have at least 4 tools");
  
  const dispatchTool = manifest.tools.find(t => t.name === "agentDispatch");
  assert.ok(dispatchTool, "agentDispatch tool should be in the manifest");
  
  // 5. Grant a secret and verify introspection
  console.log("🎁 Granting secret...");
  await ownerClient.ownerGrantAgentSecret({
    agentId: agent.agentId,
    secretAlias: "test-secret",
  });

  const updatedManifest = await agentClient.agentIntrospect();
  const secret = updatedManifest.secrets.find(s => s.alias === "test-secret");
  assert.ok(secret, "Secret should be visible in manifest");
  assert.strictEqual(secret.granted, true, "Secret should be marked as granted");

  console.log("✅ Agent correctly discovered its runtime environment and grants!");
}

runDiscoveryTest().catch(err => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
