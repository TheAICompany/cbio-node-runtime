import { createVault, createOwnerClient, createAgentClient, MemoryStorageProvider } from "../../dist/runtime/index.js";
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
  const ownerClient = await createOwnerClient({
    vault,
  });

  // 3. Create Agent
  const { agent, session_token } = await ownerClient.ownerCreateAgent({
    nickname: "Discovery-Bot",
  });

  // 4. Setup Agent Client
  const agentClient = createAgentClient({
    agentRecord: agent,
    vault,
    token: session_token.token,
  });

  console.log("🔍 Introspecting...");
  const manifest = await agentClient.agentIntrospect();

  console.log("Agent ID:", manifest.root_agent_id);
  console.log("Vault ID:", manifest.vault_id);
  console.log("Tools Count:", manifest.tools.length);

  assert.strictEqual(manifest.root_agent_id, agent.root_agent_id, "Agent ID mismatch");
  assert.ok(manifest.tools.length >= 4, "Should have at least 4 tools");
  
  const dispatchTool = manifest.tools.find(t => t.name === "agentDispatch");
  assert.ok(dispatchTool, "agentDispatch tool should be in the manifest");
  
  // 5. Grant a secret and verify introspection
  console.log("🎁 Granting secret...");
  await ownerClient.ownerGrantAgentSecret({
    root_agent_id: agent.root_agent_id,
    secret_alias: "test-secret",
  });

  const updatedManifest = await agentClient.agentIntrospect();
  const secret = updatedManifest.grants.agent_secrets.find(s => s.secret_alias === "test-secret");
  assert.ok(secret, "Secret should be visible in manifest grants");

  console.log("✅ Agent correctly discovered its runtime environment and grants!");
}

runDiscoveryTest().catch(err => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
