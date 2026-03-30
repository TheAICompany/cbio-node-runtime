import assert from "node:assert/strict";
import {
  createVault,
  createOwnerClient,
  createAgentClient,
  FsStorageProvider,
  handleVaultPendingDispatchSse,
} from "../../dist/runtime/index.js";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function waitForSseEvent(reader, predicate, timeoutMs = 3000) {
  const decoder = new TextDecoder();
  let buffer = "";
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for SSE event")), timeoutMs)),
    ]);
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex !== -1) {
      const rawFrame = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const lines = rawFrame.split("\n");
      const event = {
        id: "",
        event: "",
        data: "",
      };

      for (const line of lines) {
        if (line.startsWith("id: ")) event.id = line.slice(4);
        else if (line.startsWith("event: ")) event.event = line.slice(7);
        else if (line.startsWith("data: ")) event.data += line.slice(6);
      }

      if (!event.data) {
        separatorIndex = buffer.indexOf("\n\n");
        continue;
      }

      const parsed = {
        id: event.id,
        event: event.event,
        data: JSON.parse(event.data),
      };
      if (predicate(parsed)) {
        return parsed;
      }

      separatorIndex = buffer.indexOf("\n\n");
    }
  }

  throw new Error("Timed out waiting for matching SSE event");
}

async function runTest() {
  const tempDir = await mkdtemp(join(tmpdir(), "cbio-pending-sse-"));

  try {
    const storage = new FsStorageProvider(tempDir);
    const { vault } = await createVault(storage, {
      nickname: "Pending SSE test",
      password: "sse-test-password",
    });

    const owner = await createOwnerClient({ vault, skipWarmup: true });
    const { agent, session_token } = await owner.ownerCreateAgent({ nickname: "sse-agent" });
    await owner.ownerCreateSecret({
      alias: "api-token",
      plaintext: "secret-value",
    });

    const response = handleVaultPendingDispatchSse(vault, { pingIntervalMs: 0 });
    assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
    const reader = response.body?.getReader();
    assert.ok(reader, "SSE response should expose a readable body");

    const agentClient = createAgentClient({
      vault,
      agentRecord: agent,
      token: session_token.token,
    });

    const dispatchResult = await agentClient.agentDispatch({
      target_url: "https://api.example.com/orders",
      method: "POST",
      secret_alias: "api-token",
      reason: "Verify pending dispatch SSE delivery",
      body: "{\"ok\":true}",
    });

    assert.equal(dispatchResult.status, "AWAITING_APPROVAL");

    const event = await waitForSseEvent(
      reader,
      (entry) => entry.event === "pending_dispatch" && entry.data.record.request_id === dispatchResult.request_id,
    );

    assert.equal(event.id, event.data.event_id);
    assert.equal(event.data.record.execution.status, "AWAITING_APPROVAL");
    const secretsFound = await owner.ownerListSecrets();
    const targetSecretId = secretsFound.find(s => s.alias === "api-token").secret_id;
    assert.equal(event.data.record.request.secret_id, targetSecretId);

    await reader.cancel();
    console.log("Pending dispatch SSE helper streams new approval events");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

runTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
