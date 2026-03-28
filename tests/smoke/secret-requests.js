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
  vaultId: "vault-secret-requests",
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
const vaultAgentId = provisionedAgent.agent.id;
const crmSecret = await ownerClient.ownerCreateSecret({
  alias: "crm-token",
  plaintext: "secret",
});

let observed = null;
const unsubscribe = ownerClient.ownerOnPendingDispatch((record) => {
  observed = record;
});

const crmRecord = await ownerClient.ownerGrantAgentSecret({
  rootAgentId: vaultAgentId,
  secretAlias: crmSecret.alias.value,
});

assert.equal(crmRecord.rootAgentId, vaultAgentId);
assert.equal(crmRecord.secretAlias, crmSecret.alias.value);
assert.ok(observed, "pending grant observer should fire");

const grants = await ownerClient.ownerListGrants();
assert.ok(grants.agentSecrets.some((g) => g.rootAgentId === vaultAgentId && g.secretAlias === "crm-token"));

await ownerClient.ownerRevokeAgentSecret({
  rootAgentId: vaultAgentId,
  secretAlias: "crm-token",
});

const grantsAfterRevoke = await ownerClient.ownerListGrants();
assert.ok(!grantsAfterRevoke.agentSecrets.some((g) => g.rootAgentId === vaultAgentId && g.secretAlias === "crm-token"));

unsubscribe();

console.log("Secret grant flow OK");
