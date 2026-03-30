
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createVaultCore,
  createVaultCoreDependencies,
} from "../../dist/vault-core/index.js";
import { createVaultService } from "../../dist/vault-ingress/index.js";
import { createOwnerClient } from "../../dist/clients/owner/client.js";
import { createAgentClient } from "../../dist/clients/agent/client.js";

async function runTest() {
  console.log("🚀 Starting Secret Rename & Rotation Smoke Test (InMemory)...");

  try {
    let lastAuthHeader = null;
    const runtimeFetch = async (_url, init) => {
      lastAuthHeader = new Headers(init?.headers).get("Authorization");
      return new Response("ok", { status: 200 });
    };

    const deps = createVaultCoreDependencies({
        fetchImpl: runtimeFetch
    });
    const core = createVaultCore(deps);
    const vault = createVaultService(core);

    const owner = await createOwnerClient({ vault });

    // 1. Create agent and secret
    const { agent, session_token } = await owner.ownerCreateAgent({ nickname: "Agent" });
    await owner.ownerCreateSecret({ alias: "old-name", plaintext: "initial-value" });

    // 2. Grant permissions
    await owner.ownerGrantAgentSecret({ root_agent_id: agent.root_agent_id, secret_alias: "old-name" });
    await owner.ownerGrantSecretDestination({ secret_alias: "old-name", site_id: "api.test.com" });

    // 3. Verify dispatch works with old name
    const agentClient = createAgentClient({ agentRecord: agent, vault, token: session_token.token });
    const res1 = await agentClient.agentDispatch({
      secret_alias: "old-name",
      target_url: "https://api.test.com/v1",
      method: "GET",
      reason: "Initial check"
    });
    assert.equal(res1.status, "SUCCEEDED");
    assert.equal(lastAuthHeader, "Bearer initial-value");

    // 4. Rename and rotate
    console.log("🔄 Renaming 'old-name' to 'new-name' and updating value...");
    await owner.ownerUpdateSecret({
      alias: "old-name",
      new_alias: "new-name",
      plaintext: "rotated-value"
    });

    // 5. Verify secret is renamed in vault
    const secrets = await owner.ownerListSecrets();
    console.log("   Current secrets:", secrets.map(s => s.alias.value).join(", "));
    assert.ok(secrets.some(s => s.alias.value === "new-name"), "New alias missing");
    assert.ok(!secrets.some(s => s.alias.value === "old-name"), "Old alias still present");

    // 6. Verify grants migrated
    console.log("🕵️ Verifying grant migration...");
    const secret = secrets.find(s => s.alias.value === "new-name");
    assert.ok(secret, "New secret record not found");
    const grants = await owner.ownerListGrants({ root_agent_id: agent.root_agent_id });
    assert.ok(grants.agent_secrets.some(g => g.secret_id.value === secret.secret_id.value), "Agent grant not migrated");
    assert.ok(!grants.agent_secrets.some(g => g.secret_alias === "old-name"), "Old agent grant still present");
    assert.ok(grants.secret_destinations.some(d => d.secret_id.value === secret.secret_id.value), "Destination grant not migrated");

    // 7. Verify dispatch works with NEW name and NEW value
    console.log("🚀 Testing dispatch with new name...");
    const res2 = await agentClient.agentDispatch({
      secret_alias: "new-name",
      target_url: "https://api.test.com/v2",
      method: "GET",
      reason: "Post-rename check"
    });
    assert.equal(res2.status, "SUCCEEDED");
    assert.equal(lastAuthHeader, "Bearer rotated-value");

    // 8. Verify old name fails (Denied, not rejected)
    console.log("🕵️ Verifying old name is denied...");
    const resForbidden = await agentClient.agentDispatch({
        secret_alias: "old-name",
        target_url: "https://api.test.com/v3",
        method: "GET",
        reason: "Should fail"
    });
    assert.equal(resForbidden.status, "DENIED");
    assert.match(resForbidden.error, /secret not found/);

    // 9. Test rename only
    console.log("📦 Testing rename only...");
    await owner.ownerUpdateSecret({ alias: "new-name", new_alias: "final-name" });
    const res3 = await agentClient.agentDispatch({
        secret_alias: "final-name",
        target_url: "https://api.test.com/v4",
        method: "GET",
        reason: "Rename only check"
    });
    assert.equal(res3.status, "SUCCEEDED");
    assert.equal(lastAuthHeader, "Bearer rotated-value");

    // 10. Test value update only
    console.log("🔑 Testing value update only...");
    await owner.ownerUpdateSecret({ alias: "final-name", plaintext: "final-value" });
    const res4 = await agentClient.agentDispatch({
        secret_alias: "final-name",
        target_url: "https://api.test.com/v5",
        method: "GET",
        reason: "Value update only check"
    });
    assert.equal(res4.status, "SUCCEEDED");
    assert.equal(lastAuthHeader, "Bearer final-value");

    // 11. Verify secret_id in request history
    console.log("🕵️ Verifying secret_id in request history...");
    const requests = await owner.ownerListRequests();
    const lastRequest = requests.find(r => r.request_id === res4.request_id);
    assert.ok(lastRequest, "Last request not found in history");
    assert.ok(lastRequest.secret_id, "secret_id missing in request history");
    assert.equal(lastRequest.secret_id.value, secret.secret_id.value, "secret_id mismatch in request history");

    console.log("✅ Secret Rename & Rotation Smoke Test Passed!");
  } catch (err) {
    console.error("❌ Test Failed:", err);
    process.exit(1);
  }
}

runTest();
