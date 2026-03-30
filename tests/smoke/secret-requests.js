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
  vault_id: "vault-secret-requests",
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
const vaultAgentId = provisionedAgent.agent.root_agent_id;
const crmSecret = await ownerClient.ownerCreateSecret({
  alias: "crm-token",
  plaintext: "secret",
});

let observed = null;
const unsubscribe = ownerClient.ownerOnPendingDispatch({
  onEvent: (event) => {
    observed = event.record;
  },
});

const crmRecord = await ownerClient.ownerGrantAgentSecret({
  root_agent_id: vaultAgentId,
  secret_alias: crmSecret.alias,
});

assert.equal(crmRecord.root_agent_id, vaultAgentId);
assert.equal(crmRecord.alias, crmSecret.alias);
assert.ok(observed, "pending grant observer should fire");

const grants = await ownerClient.ownerListGrants();
assert.ok(grants.agent_secrets.some((g) => g.root_agent_id === vaultAgentId && g.secret_alias === "crm-token"));

await ownerClient.ownerRevokeAgentSecret({
  root_agent_id: vaultAgentId,
  secret_alias: "crm-token",
});

const grantsAfterRevoke = await ownerClient.ownerListGrants();
assert.ok(!grantsAfterRevoke.agent_secrets.some((g) => g.root_agent_id === vaultAgentId && g.secret_alias === "crm-token"));

unsubscribe();

console.log("Secret grant flow OK");
