import assert from "node:assert/strict";
import { createVault, createVaultClient, MemoryStorageProvider } from "../../dist/runtime/index.js";

const created = await createVault(new MemoryStorageProvider(), {
  password: "pw-owner-update",
});

const client = createVaultClient({
  vault: created.vault,
  passwordVerifier: created.verifyPassword,
  skipWarmup: true,
});

const provisioned = await client.ownerCreateAgent({
  nickname: "Before",
  metadata: { team: "ops" },
});

const updated = await client.ownerUpdateAgent({
  agentId: provisioned.agent.agentId,
  nickname: "After",
  metadata: { team: "platform" },
});

assert.equal(updated.nickname, "After");
assert.deepEqual(updated.metadata, { team: "platform" });

const listed = await client.ownerListAgents();
const found = listed.find((agent) => agent.agentId === provisioned.agent.agentId);
assert.equal(found?.nickname, "After");
assert.deepEqual(found?.metadata, { team: "platform" });

console.log("owner update agent smoke ok");
