import { createVault, createOwnerClient, createAgentClient, MemoryStorageProvider } from "../../dist/runtime/index.js";
import assert from "node:assert";

/**
 * Smoke Test: HITL Approval & Grant Flow (v1.65.0 - Grant-based)
 * Verifies the simplified decision-based authorization model.
 */
async function runHitlTest() {
  console.log("🚀 Starting HITL Approval Smoke Test...");

  // 1. Setup Vault
  const { vault } = await createVault(new MemoryStorageProvider(), {
    nickname: "HITL Test Vault",
    password: "master-password",
  });

  // 2. Setup Clients
  const ownerClient = await createOwnerClient({
    vault,
  });

  const { agent, session_token } = await ownerClient.ownerCreateAgent({
    nickname: "HITL-Bot",
  });

  const agentClient = createAgentClient({
    agentRecord: agent,
    vault,
    token: session_token.token,
  });

  // 3. Register a Secret
  await ownerClient.ownerCreateSecret({
    alias: "my-key",
    plaintext: "secret-value",
  });

  // 4. Initial attempt: No grant -> Should be awaiting approval
  console.log("🔍 Attempting dispatch without grant...");
  const pendingResult = await agentClient.agentDispatch({
    target_url: "https://api.example.com/data",
    method: "POST",
    secret_alias: "my-key",
    reason: "Initial test request",
    body: "ping",
  });

  assert.strictEqual(pendingResult.status, "AWAITING_APPROVAL", "Initial request should be awaiting approval");
  
  // 5. Verify NO grants were created yet
  console.log("Verifying grant registry is still empty...");
  const earlyGrants = await ownerClient.ownerListGrants({ root_agent_id: agent.root_agent_id, secret_alias: "my-key" });
  assert.strictEqual(earlyGrants.agent_secrets.length, 0, "No agent secret grant should exist before approval");
  assert.strictEqual(earlyGrants.secret_destinations.length, 0, "No destination grant should exist before approval");

  // 6. Owner list pending and approve "allow_and_grant"
  console.log("🎁 Approving always (allow_and_grant)...");
  const pendingRequests = await ownerClient.ownerListRequests({ root_agent_id: agent.root_agent_id });
  const req = pendingRequests.find(r => r.execution_status === "AWAITING_APPROVAL");
  assert.ok(req, "Should find request awaiting approval");

  const approvedResult = await ownerClient.ownerApproveDispatch({
    request_id: req.request_id,
    decision: "allow_and_grant",
  });

  assert.ok(approvedResult, "Approval should return result");
  assert.strictEqual(approvedResult.status, "SUCCEEDED", "Approval should execute immediately");

  // 6. Verify grants were created
  console.log("Verifying grants were automatically created...");
  const grants = await ownerClient.ownerListGrants({ root_agent_id: agent.root_agent_id, secret_alias: "my-key" });
  assert.ok(grants.agent_secrets.length > 0, "Agent secret grant should be created");
  assert.ok(grants.secret_destinations.some(d => d.site_id === "api.example.com"), "Destination grant should be created");

  // 7. Second attempt: Should succeed automatically
  console.log("🔍 Second attempt (should be whitelisted now)...");
  const successResult = await agentClient.agentDispatch({
    target_url: "https://api.example.com/other",
    method: "POST",
    secret_alias: "my-key",
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
