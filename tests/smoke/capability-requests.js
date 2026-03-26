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

let observed = null;
const unsubscribe = ownerClient.ownerOnPendingCapabilityRequest((record) => {
  observed = record;
});

const submitted = await ownerClient.ownerSubmitCapabilityRequest({
  requester: { kind: "trusted_executor", id: "llm-planner" },
  agentId: vaultAgentId,
  secretAliases: ["crm-token"],
  scope: "https://api.example.com/users/*",
  methods: ["GET"],
  justification: "Need to read user resources without per-id approval",
});

assert.equal(submitted.agentId, vaultAgentId);
assert.deepEqual(submitted.scope.methods, ["GET"]);
assert.equal(submitted.scope.scope, "https://api.example.com/users/*");
assert.ok(observed, "pending capability request observer should fire");

const pending = await ownerClient.ownerListPendingCapabilityRequests();
assert.equal(pending.length, 1);
assert.equal(pending[0].justification, "Need to read user resources without per-id approval");

const approved = await ownerClient.ownerApproveCapabilityRequest({
  requestId: pending[0].requestId,
});
assert.equal(typeof approved.capabilityId, "string");
assert.deepEqual(approved.methods, ["GET"]);
assert.equal(approved.scope, "https://api.example.com/users/*");

const capabilities = await ownerClient.ownerListCapabilities({ agentId: vaultAgentId });
assert.ok(capabilities.some((cap) => cap.capabilityId === approved.capabilityId));

await ownerClient.ownerSubmitCapabilityRequest({
  requester: { kind: "trusted_executor", id: "llm-planner" },
  agentId: vaultAgentId,
  secretAliases: ["crm-token"],
  scope: "https://api.example.com/admin/*",
  methods: ["POST"],
});
const pendingAfterSecondSubmit = await ownerClient.ownerListPendingCapabilityRequests();
assert.equal(pendingAfterSecondSubmit.length, 1);
await ownerClient.ownerRejectCapabilityRequest(pendingAfterSecondSubmit[0].requestId);
assert.equal((await ownerClient.ownerListPendingCapabilityRequests()).length, 0);

unsubscribe();

console.log("Capability request flow OK");
