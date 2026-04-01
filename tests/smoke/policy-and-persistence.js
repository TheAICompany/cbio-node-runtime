import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createVault,
  recoverVault,
  createOwnerClient,
  createAgentClient,
  FsStorageProvider,
} from "../../dist/runtime/index.js";

/**
 * Smoke Test: Policy & Persistence (v1.65.0 - Grant-based)
 * Verifies that grants and secrets are persisted to disk and survive a restart.
 */
async function runPersistenceTest() {
  console.log("🚀 Starting Policy & Persistence Smoke Test...");
  const tempDir = await mkdtemp(join(tmpdir(), "cbio-persistence-"));

  try {
    const storage = new FsStorageProvider(tempDir);
    let seenAuthHeader = null;
    const runtimeFetch = async (_url, init) => {
      seenAuthHeader = new Headers(init?.headers).get("Authorization");
      return new Response("ok", { status: 200 });
    };

    // 1. Create and configure vault
    console.log("📦 Creating vault...");
    const { vault, core } = await createVault(storage, {
      nickname: "Persistent Vault",
      password: "master-password",
      fetchImpl: runtimeFetch,
    });

    const ownerClient = await createOwnerClient({
      vault,
    });

    const { agent, session_token } = await ownerClient.ownerCreateAgent({
      nickname: "Persistent-Bot",
    });

    await ownerClient.ownerCreateSecret({
      alias: "persistent-secret",
      plaintext: "i-survive-restarts",
    });

    // 2. Grant permissions
    console.log("🎁 Granting permissions...");
    await ownerClient.ownerGrantAgentSecret({
      root_agent_id: agent.root_agent_id,
      secret_alias: "persistent-secret",
    });
    await ownerClient.ownerCreateSite({ domain: "api.persistent.com" });
    
    await ownerClient.ownerGrantSecretDestination({
      secret_alias: "persistent-secret",
      site_id: "api.persistent.com",
    });

    const listedBeforeRestart = await ownerClient.ownerListAgents();
    const listedBeforeRestartAgent = listedBeforeRestart.find((entry) => entry.root_agent_id === agent.root_agent_id);
    assert.equal(listedBeforeRestartAgent?.session_token?.token, session_token.token, "ownerListAgents should expose the current persisted session token");

    // 3. Verify initial state
    const initialGrants = await ownerClient.ownerListGrants({ root_agent_id: agent.root_agent_id });
    assert.strictEqual(initialGrants.agent_secrets.length, 1);
    assert.strictEqual(initialGrants.secret_destinations.length, 1);

    // 4. Restart (simulated by re-opening the vault)
    console.log("🔄 Restarting vault...");
    const { vault: reloadedVault } = await recoverVault(storage, {
      vault_id: vault.vault_id,
      password: "master-password",
      fetchImpl: runtimeFetch,
    });
    
    // Actually, let's just use the same storage and re-initialize the dependencies
    // To be truly "smoke", we just want to see if the files exist.
    
    const ownerClient2 = await createOwnerClient({
      vault: reloadedVault,
      skipWarmup: true,
    });

    const reloadedGrants = await ownerClient2.ownerListGrants({ root_agent_id: agent.root_agent_id });
    const listedAfterRestart = await ownerClient2.ownerListAgents();
    const listedAfterRestartAgent = listedAfterRestart.find((entry) => entry.root_agent_id === agent.root_agent_id);
    
    // 5. Assertions
    console.log("Verifying persistence data...");
    assert.strictEqual(reloadedGrants.agent_secrets.length, 1, "Agent secret grant lost after restart");
    assert.strictEqual(reloadedGrants.secret_destinations.length, 1, "Destination grant lost after restart");
    assert.equal(listedAfterRestartAgent?.session_token?.token, session_token.token, "Persisted session token missing after restart");
    
    const secrets = await ownerClient2.ownerListSecrets();
    assert.ok(secrets.some(s => s.alias === "persistent-secret"), "Secret lost after restart");

    const reloadedAgentClient = createAgentClient({
      agentRecord: agent,
      vault: reloadedVault,
      token: session_token.token,
    });
    const dispatchResult = await reloadedAgentClient.agentDispatch({
      secret_alias: "persistent-secret",
      target_url: "https://api.persistent.com/restart-check",
      method: "POST",
      reason: "Verify persisted session token after restart",
    });
    assert.equal(dispatchResult.status, "SUCCEEDED", "Persisted session token failed after restart");
    assert.equal(seenAuthHeader, "Bearer i-survive-restarts");

    const rotatedSession = await ownerClient2.ownerIssueSessionToken({ root_agent_id: agent.root_agent_id });
    const listedAfterRotation = await ownerClient2.ownerListAgents();
    const listedAfterRotationAgent = listedAfterRotation.find((entry) => entry.root_agent_id === agent.root_agent_id);
    assert.equal(listedAfterRotationAgent?.session_token?.token, rotatedSession.token, "Rotated session token was not persisted");

    console.log("✅ Policy & Persistence Test Passed!");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

runPersistenceTest().catch(err => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
