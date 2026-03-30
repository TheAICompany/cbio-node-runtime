import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createVault,
  createOwnerClient,
  createAgentClient,
  FsStorageProvider,
  VaultCoreError,
} from "../../dist/runtime/index.js";

async function runPersistentRuntimeSecurityTest() {
  console.log("🚀 Starting Persistent Runtime Security Smoke Test...");
  const tempDir = await mkdtemp(join(tmpdir(), "cbio-persistent-security-"));

  try {
    const storage = new FsStorageProvider(tempDir);
    let seenAuthHeader = null;
    const runtimeFetch = async (_url, init) => {
      seenAuthHeader = new Headers(init?.headers).get("Authorization");
      return new Response("ok", { status: 200 });
    };

    const { vault, core } = await createVault(storage, {
      nickname: "Persistent Security Vault",
      password: "master-password",
      fetchImpl: runtimeFetch,
    });

    const ownerClient = await createOwnerClient({
      vault,
      skipWarmup: true,
    });

    const { agent, session_token } = await ownerClient.ownerCreateAgent({
      nickname: "Persistent-Security-Agent",
    });

    const guardedRecord = await ownerClient.ownerCreateSecret({
      alias: "persistent-guarded-token",
      plaintext: "persistent-guarded-secret",
    });
    const secret_id = guardedRecord.secret_id;
    await ownerClient.ownerGrantAgentSecret({
      root_agent_id: agent.root_agent_id,
      secret_alias: "persistent-guarded-token",
    });
    await ownerClient.ownerGrantSecretDestination({
      secret_alias: "persistent-guarded-token",
      site_id: "guarded.example.com",
    });

    const goodAgentClient = createAgentClient({
      agentRecord: agent,
      vault,
      token: session_token.token,
    });
    const success = await goodAgentClient.agentDispatch({
      secret_alias: "persistent-guarded-token",
      target_url: "https://guarded.example.com/ok",
      method: "POST",
      reason: "Verify persistent runtime dispatch path",
    });
    assert.equal(success.status, "SUCCEEDED");
    assert.equal(seenAuthHeader, "Bearer persistent-guarded-secret");

    const badAgentClient = createAgentClient({
      agentRecord: agent,
      vault,
      token: "sat_invalid",
    });
    await assert.rejects(
      badAgentClient.agentDispatch({
        secret_alias: "persistent-guarded-token",
        target_url: "https://guarded.example.com/denied",
        method: "POST",
        reason: "Invalid token should be rejected",
      }),
      (error) => {
        assert.equal(error instanceof Error, true);
        assert.match(error.message, /session token not found/);
        return true;
      },
    );

    const otherAgent = await ownerClient.ownerCreateAgent({
      nickname: "Other-Agent",
    });
    const wrongBindingRequestId = "persistent-agent-mismatch";
    const wrongBindingRequestedAt = new Date().toISOString();
    await assert.rejects(
      core.agentDispatchSecret({
        vault_id: core.vault_id,
        request_id: wrongBindingRequestId,
        requested_at: wrongBindingRequestedAt,
        agent: { kind: "agent", id: otherAgent.agent.root_agent_id },
        proof: {
          root_agent_id: otherAgent.agent.root_agent_id,
          token: session_token.token,
          request_id: wrongBindingRequestId,
          requested_at: wrongBindingRequestedAt,
        },
        secret_id,
        target_url: "https://guarded.example.com/mismatch",
        method: "POST",
        reason: "Wrong agent should not be able to use another agent token",
      }),
      (error) => {
        assert.equal(error instanceof VaultCoreError, true);
        assert.equal(error.code, "VAULT_DISPATCH_DENIED");
        assert.match(error.message, /session token does not belong to this agent/);
        return true;
      },
    );

    const replayRequest = {
      vault_id: core.vault_id,
      request_id: "persistent-replay-request",
      requested_at: new Date().toISOString(),
      agent: { kind: "agent", id: agent.root_agent_id },
      proof: {
        root_agent_id: agent.root_agent_id,
        token: session_token.token,
        request_id: "persistent-replay-request",
        requested_at: new Date().toISOString(),
      },
      secret_id,
      target_url: "https://guarded.example.com/replay",
      method: "POST",
      reason: "Replay guard smoke",
    };
    replayRequest.proof.requested_at = replayRequest.requested_at;

    const firstReplayAttempt = await core.agentDispatchSecret(replayRequest);
    assert.equal(firstReplayAttempt.status, "SUCCEEDED");

    await assert.rejects(
      core.agentDispatchSecret(replayRequest),
      (error) => {
        assert.equal(error instanceof VaultCoreError, true);
        assert.equal(error.code, "VAULT_DISPATCH_DENIED");
        assert.match(error.message, /replay detected/);
        return true;
      },
    );

    console.log("persistent runtime security smoke test passed");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

runPersistentRuntimeSecurityTest().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
