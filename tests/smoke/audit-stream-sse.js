import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createVault,
  createOwnerClient,
  createAgentClient,
  FsStorageProvider,
  handleVaultAuditSse,
} from "../../dist/runtime/index.js";

function parseSseFrames(buffer) {
  const frames = [];
  let separatorIndex = buffer.indexOf("\n\n");
  while (separatorIndex !== -1) {
    frames.push(buffer.slice(0, separatorIndex));
    buffer = buffer.slice(separatorIndex + 2);
    separatorIndex = buffer.indexOf("\n\n");
  }
  return { frames, rest: buffer };
}

async function waitForAuditEntries(reader, predicate, timeoutMs = 4000) {
  const decoder = new TextDecoder();
  const startedAt = Date.now();
  let buffer = "";
  const seen = [];

  while (Date.now() - startedAt < timeoutMs) {
    const remaining = timeoutMs - (Date.now() - startedAt);
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for audit SSE entries")), remaining)),
    ]);
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parsed = parseSseFrames(buffer);
    buffer = parsed.rest;
    for (const rawFrame of parsed.frames) {
      const event = { id: "", event: "", data: "" };
      for (const line of rawFrame.split("\n")) {
        if (line.startsWith("id: ")) event.id = line.slice(4);
        else if (line.startsWith("event: ")) event.event = line.slice(7);
        else if (line.startsWith("data: ")) event.data += line.slice(6);
      }
      if (!event.data) continue;
      seen.push({
        id: event.id,
        event: event.event,
        data: JSON.parse(event.data),
      });
      if (predicate(seen)) {
        return seen;
      }
    }
  }

  throw new Error(`Timed out waiting for matching audit entries. Seen: ${JSON.stringify(seen.map((entry) => entry.data.function_name))}`);
}

async function runTest() {
  const tempDir = await mkdtemp(join(tmpdir(), "cbio-audit-stream-sse-"));

  try {
    const storage = new FsStorageProvider(tempDir);
    const { vault } = await createVault(storage, {
      nickname: "Audit stream test",
      password: "audit-stream-password",
      fetchImpl: async () => new Response("ok", { status: 200 }),
    });

    const owner = await createOwnerClient({ vault, skipWarmup: true });
    const response = handleVaultAuditSse(vault, { pingIntervalMs: 0 });
    assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
    const reader = response.body?.getReader();
    assert.ok(reader, "audit stream should expose a readable body");

    const created = await owner.ownerCreateAgent({ nickname: "audit-agent" });
    await owner.ownerCreateSecret({
      alias: "api-token",
      plaintext: "secret-value",
    });

    const agent = createAgentClient({
      vault,
      agentRecord: created.agent,
      token: created.session_token.token,
    });

    const pending = await agent.agentDispatch({
      target_url: "https://api.example.com/orders",
      method: "POST",
      secret_alias: "api-token",
      reason: "Verify audit-driven notifications",
      body: "{\"ok\":true}",
    });
    assert.equal(pending.status, "AWAITING_APPROVAL");

    const approved = await owner.ownerApproveDispatch({
      request_id: pending.request_id,
      decision: "allow_and_grant",
    });
    assert.equal(approved?.status, "SUCCEEDED");

    const observedEntries = await waitForAuditEntries(reader, (entries) => {
      const records = entries
        .filter((entry) => !entry.data.input?.request_id || entry.data.input?.request_id === pending.request_id);
      
      const functionNames = records.map(entry => entry.data.function_name);
      
      return functionNames.includes("ownerRegisterAgentIdentity")
        && functionNames.includes("ownerIssueSessionToken")
        && functionNames.includes("ownerCreateSecret")
        && records.some(e => e.data.function_name === "agentDispatchSecret" && e.data.output?.status === "AWAITING_APPROVAL")
        && functionNames.includes("ownerApproveDispatch")
        && records.some(e => e.data.function_name === "agentDispatchSecret" && e.data.output?.status === "SUCCEEDED")
        && records.some(e => e.data.function_name === "ownerApproveDispatch_grant" && e.data.output?.request_id === pending.request_id);
    });

    assert.ok(observedEntries.some((entry) => entry.data.function_name === "ownerRegisterAgentIdentity"));
    assert.ok(observedEntries.some((entry) => entry.data.function_name === "ownerIssueSessionToken"));
    assert.ok(observedEntries.some((entry) => entry.data.function_name === "ownerCreateSecret"));
    assert.ok(observedEntries.some((entry) => entry.data.function_name === "agentDispatchSecret" && entry.data.input?.request_id === pending.request_id && entry.data.output?.status === "AWAITING_APPROVAL"));
    assert.ok(observedEntries.some((entry) => entry.data.function_name === "ownerApproveDispatch" && entry.data.input?.request_id === pending.request_id));
    assert.ok(observedEntries.some((entry) => entry.data.function_name === "agentDispatchSecret" && entry.data.input?.request_id === pending.request_id && entry.data.output?.status === "SUCCEEDED"));
    assert.ok(observedEntries.some((entry) => entry.data.function_name === "ownerApproveDispatch_grant" && entry.data.output?.request_id === pending.request_id));

    await reader.cancel();
    console.log("Audit SSE stream publishes append-only notifications for identity, secret, request, and approval changes");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

runTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
