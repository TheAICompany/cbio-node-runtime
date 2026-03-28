import { createVault, createVaultClient, createAgentClient, MemoryStorageProvider } from "../../src/runtime/index.js";
import assert from "node:assert";

/**
 * Smoke Test: HITL Approval & Grant Flow (v1.65.0 - Grant-based)
 * Verifies the simple decision-based authorization model.
 */
async function runHitlTest() {
  console.log("🚀 Starting HITL Approval Smoke Test...");

  // 1. Setup Vault
  const { vault } = await createVault(new MemoryStorageProvider(), {
    nickname: "HITL Test Vault",
    password: "master-password",
  });

  // 2. Setup Clients
  const ownerClient = createVaultClient({
    vault,
    ownerIdentity: { identityId: "owner-1" },
  });

  const { agent, sessionToken } = await ownerClient.ownerCreateAgent({
    nickname: "HITL-Bot",
  });

  const agentClient = createAgentClient({
    agentIdentity: agent,
    vault,
    token: sessionToken.token,
  });

  // 3. Register a Secret
  await ownerClient.ownerCreateSecret({
    alias: "my-key",
    plaintext: "secret-value",
  });

  // 4. Initial attempt: No grant -> Should be PENDING
  console.log("🔍 Attempting dispatch without grant...");
  const pendingResult = await agentClient.agentDispatch({
    targetUrl: "https://api.example.com/data",
    method: "POST",
    secretAlias: "my-key",
    reason: "Initial test request",
    body: "ping",
  });

  assert.strictEqual(pendingResult.status, "PENDING", "Initial request should be pending");
  
  // 5. Verify NO grants were created yet (Decoupled model)
  console.log("验证权限表此时应保持为空...");
  const earlyGrants = await ownerClient.ownerListGrants({ agentId: agent.agentId, secretAlias: "my-key" });
  assert.strictEqual(earlyGrants.agentSecrets.length, 0, "No agent secret grant should exist before approval");
  assert.strictEqual(earlyGrants.secretDestinations.length, 0, "No destination grant should exist before approval");

  // 6. Owner list pending and approve "allow_and_grant"
  console.log("🎁 Approving always...");
  const pendingRequests = await ownerClient.ownerListRequests({ agentId: agent.agentId });
  const req = pendingRequests.find(r => r.status === "PENDING");
  assert.ok(req, "Should find pending request");

  const approvedResult = await ownerClient.ownerApproveDispatch({
    requestId: req.requestId,
    decision: "allow_and_grant",
  });

  assert.ok(approvedResult, "Approval should return result");
  assert.strictEqual(approvedResult.status, "SUCCEEDED", "Approval should execute immediately");

  // 6. Verify grants were created
  console.log("验证权限是否自动创建...");
  const grants = await ownerClient.ownerListGrants({ agentId: agent.agentId, secretAlias: "my-key" });
  assert.ok(grants.agentSecrets.length > 0, "Agent secret grant should be created");
  assert.ok(grants.secretDestinations.some(d => d.domain === "api.example.com"), "Destination grant should be created");

  // 7. Second attempt: Should succeed automatically
  console.log("🔍 Second attempt (should be whitelisted now)...");
  const successResult = await agentClient.agentDispatch({
    targetUrl: "https://api.example.com/other",
    method: "POST",
    secretAlias: "my-key",
    reason: "Subsequent request",
    body: "pong",
  });

  assert.strictEqual(successResult.status, "SUCCEEDED", "Second request should be whitelisted");

  console.log("✅ HITL Approval & Automatic Granting Test Passed!");
}

runHitlTest().catch(err => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
