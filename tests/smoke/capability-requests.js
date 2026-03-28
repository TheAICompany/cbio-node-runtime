import assert from "node:assert/strict";
import {
  createOwnerClient,
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
const ownerClient = createOwnerClient({
  vault,
  skipWarmup: true,
});

const provisionedAgent = await ownerClient.ownerCreateAgent({
  nickname: "Planner",
});
const vaultAgentId = provisionedAgent.agent.agentId;
const crmSecret = await ownerClient.ownerCreateSecret({
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
  read: { paths: ["$"] },
  reason: "Need to read user resources without per-id approval",
});

assert.equal(submitted.agentId, vaultAgentId);
assert.deepEqual(submitted.write.methods, ["GET"]);
assert.equal(submitted.write.scope, "https://api.example.com/users/*");
assert.ok(observed, "pending capability request observer should fire");

const pending = await ownerClient.ownerListCapabilityStates({ writeGranted: false });
assert.equal(pending.length, 1);
assert.equal(pending[0].reason, "Need to read user resources without per-id approval");
assert.equal(pending[0].writeGrant, null);
assert.equal(pending[0].readGrant, null);

const approved = await ownerClient.ownerAllowAlways({
  requestId: pending[0].requestId,
});
assert.equal(approved.status, "SUCCEEDED");

const granted = await ownerClient.ownerListCapabilityStates({ writeGranted: true });
assert.equal(granted.length, 1);
assert.equal(granted[0].writeGrant, "always");
assert.equal(granted[0].readGrant, null);

const readApproved = await ownerClient.ownerApproveCapabilityRead({
  requestId: granted[0].requestId,
});
assert.equal(readApproved.writeGrant, "always");
assert.deepEqual(readApproved.readGrant, []);

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
  read: { paths: ["$"] },
});
const pendingAfterSecondSubmit = await ownerClient.ownerListCapabilityStates({ writeGranted: false });
assert.equal(pendingAfterSecondSubmit.length, 1);
await ownerClient.ownerDeny(pendingAfterSecondSubmit[0].requestId);
assert.equal((await ownerClient.ownerListCapabilityStates({ writeGranted: false })).length, 0);

unsubscribe();

console.log("Capability request flow OK");
