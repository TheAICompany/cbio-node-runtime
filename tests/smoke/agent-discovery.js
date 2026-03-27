import { createVaultClient } from "../../dist/clients/owner/client.js";
import { createAgentClient } from "../../dist/clients/agent/client.js";
import assert from "node:assert";

/**
 * Smoke Test: Agent Introspection & Discovery (v1.56.0)
 * Verifies that an agent can self-discover its identity, capabilities, and tools.
 */
async function runDiscoveryTest() {
  console.log("🚀 Starting Agent Discovery Smoke Test...");

  const owner = await createVaultClient({
    vaultPath: `./test-vault-discovery-${Date.now()}`,
    password: "master-password",
  });

  const { agent, sessionToken } = await owner.ownerCreateAgent({
    nickname: "Discovery-Bot",
  });

  const agentClient = createAgentClient({
    agentIdentity: agent,
    capability: {
      vaultId: { value: owner.vaultId },
      capabilityId: "initial-sync",
      agentId: agent.agentId,
      operation: "dispatch_http",
      write: { scope: "https://api.github.com/*", methods: ["GET"] },
      read: { mode: "full" },
      grantedAt: new Date().toISOString(),
    },
    vault: owner._service, // Use local vault service for testing
    token: sessionToken,
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
  assert.ok(dispatchTool.description.includes("dispatch"), "Tool description missing");
  assert.ok(dispatchTool.parameters.properties.secretAlias, "Tool parameters missing secretAlias");

  console.log("✅ Agent correctly discovered its runtime environment!");
  
  // Clean up
  await owner.close();
}

runDiscoveryTest().catch(err => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
