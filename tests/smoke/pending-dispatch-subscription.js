import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import * as fs from "node:fs/promises";
import {
  FsStorageProvider,
  createVault,
  createOwnerClient,
  createAgentClient,
  recoverVault,
} from "../../dist/runtime/index.js";

async function waitFor(condition, timeoutMs, message) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
}

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cbio-pending-subscription-"));

try {
  const storage = new FsStorageProvider(tempDir);
  const password = "subscription-test-password";

  const { vault } = await createVault(storage, {
    nickname: "Pending subscription test",
    password,
  });

  const authoringOwner = await createOwnerClient({ vault, skipWarmup: true });
  const { agent, session_token } = await authoringOwner.ownerCreateAgent({
    nickname: "cross-instance-agent",
  });

  await authoringOwner.ownerCreateSecret({
    alias: "api-token",
    plaintext: "secret-value",
  });

  const { vault: recoveredVault } = await recoverVault(storage, {
    vault_id: vault.vault_id,
    password,
  });
  const observingOwner = await createOwnerClient({
    vault: recoveredVault,
    skipWarmup: true,
  });

  const observed = [];
  const unsubscribe = observingOwner.ownerOnPendingDispatch({
    onEvent: (event) => {
      observed.push(event);
    },
  });

  const agentClient = createAgentClient({
    vault,
    agentRecord: agent,
    token: session_token.token,
  });

  const result = await agentClient.agentDispatch({
    target_url: "https://api.example.com/orders",
    method: "POST",
    secret_alias: "api-token",
    reason: "cross-instance pending subscription test",
    body: "{\"ok\":true}",
  });

  assert.equal(result.status, "AWAITING_APPROVAL");

  await waitFor(
    async () => observed.some((event) => event.record.request_id === result.request_id),
    3000,
    "cross-instance observer should receive persisted pending dispatch",
  );

  const pending = await observingOwner.ownerListRequests({
    root_agent_id: agent.root_agent_id,
  });
  assert.ok(
    pending.some((record) => record.request_id === result.request_id && record.execution_status === "AWAITING_APPROVAL"),
    "recovered owner should see pending dispatch in request store",
  );

  const replayed = [];
  const unsubscribeReplay = observingOwner.ownerOnPendingDispatch({
    afterEventId: observed.at(-1)?.event_id,
    onEvent: (event) => {
      replayed.push(event);
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(replayed.length, 0, "afterEventId should suppress already-consumed pending events");

  unsubscribe();
  unsubscribeReplay();
  console.log("Pending dispatch subscription stays durable across recovered vault instances");
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
