import assert from "node:assert/strict";
import {
  createVaultClient,
} from "../../dist/runtime/index.js";
import {
  createVaultCore,
  createVaultCoreDependencies,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";

const deps = createVaultCoreDependencies({
  vaultId: "vault-capability-requests",
  fetchImpl: async () => new Response("ok", { status: 200 }),
});
const authority = createVaultCore(deps);
const vault = wrapVaultCoreAsVaultService(authority);
const ownerClient = createVaultClient({
  vault,
  skipWarmup: true,
});

const provisionedAgent = await ownerClient.ownerCreateAgent({
  nickname: "Planner",
});
const vaultAgentId = provisionedAgent.agent.agentId;
const crmSecret = await ownerClient.ownerWriteSecret({
  alias: "crm-token",
  plaintext: "secret",
});

let observed = null;
const unsubscribe = ownerClient.ownerOnCapabilityState((record) => {
  observed = record;
});

const submitted = await ownerClient.ownerSubmitCapabilityRequest({
  requester: { kind: "trusted_executor", id: "llm-planner" },
  agentId: vaultAgentId,
  write: {
    secretIds: [crmSecret.secretId.value],
    scope: "https://api.example.com/users/*",
    methods: ["GET"],
  },
  read: { mode: "full" },
  justification: "Need to read user resources without per-id approval",
});

assert.equal(submitted.agentId, vaultAgentId);
assert.deepEqual(submitted.write.methods, ["GET"]);
assert.equal(submitted.write.scope, "https://api.example.com/users/*");
assert.ok(observed, "pending capability request observer should fire");

const pending = await ownerClient.ownerListCapabilityStates({ status: "PENDING" });
assert.equal(pending.length, 1);
assert.equal(pending[0].justification, "Need to read user resources without per-id approval");

const approved = await ownerClient.ownerExecuteCapabilityStateAndGrant({
  requestId: pending[0].requestId,
});
assert.equal(approved.status, "SUCCEEDED");

const capabilities = await ownerClient.ownerListCapabilities({ agentId: vaultAgentId });
assert.ok(capabilities.some((cap) => cap.write.scope === "https://api.example.com/users/*"));

await ownerClient.ownerSubmitCapabilityRequest({
  requester: { kind: "trusted_executor", id: "llm-planner" },
  agentId: vaultAgentId,
  write: {
    secretIds: [crmSecret.secretId.value],
    scope: "https://api.example.com/admin/*",
    methods: ["POST"],
  },
  read: { mode: "full" },
});
const pendingAfterSecondSubmit = await ownerClient.ownerListCapabilityStates({ status: "PENDING" });
assert.equal(pendingAfterSecondSubmit.length, 1);
await ownerClient.ownerRejectCapabilityState(pendingAfterSecondSubmit[0].requestId);
assert.equal((await ownerClient.ownerListCapabilityStates({ status: "PENDING" })).length, 0);

unsubscribe();

console.log("Capability request flow OK");
