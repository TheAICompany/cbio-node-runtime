import assert from "node:assert/strict";
import {
  createOwnerClient,
  createAgentClient,
  createIdentity,
} from "../../dist/runtime/index.js";
import {
  createVaultCoreDependencies,
  createVaultCore,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";

const deps = createVaultCoreDependencies({
  vault_id: "vault-agent-introspection",
  fetchImpl: async () => new Response("ok", { status: 200 }),
});
const authority = createVaultCore(deps);
const vault = wrapVaultCoreAsVaultService(authority);
const ownerClient = await createOwnerClient({ vault, skipWarmup: true });

const agentRecord = createIdentity({ nickname: "introspector" });
const importedAgent = await ownerClient.ownerImportAgent({
  private_key: agentRecord.private_key,
});
const vaultAgentId = importedAgent.agent.root_agent_id;

const crmRecord = await ownerClient.ownerCreateSecret({
  alias: "crm-token",
  plaintext: "secret-crm-token",
});
await ownerClient.ownerCreateSecret({
  alias: "payroll-token",
  plaintext: "secret-payroll-token",
});

// Use Grant APIs
await ownerClient.ownerGrantAgentSecret({
  root_agent_id: vaultAgentId,
  secret_alias: "crm-token",
});
await ownerClient.ownerCreateSite({ domain: "api.example.com" });
await ownerClient.ownerGrantSecretDestination({
  secret_alias: "crm-token",
  site_id: "api.example.com",
});

const session = await ownerClient.ownerIssueSessionToken({ root_agent_id: vaultAgentId });
const agentClient = createAgentClient({
  agentRecord: importedAgent.agent,
  vault,
  token: session.token,
});

const manifest = await agentClient.agentIntrospect();
assert.equal(manifest.root_agent_id, vaultAgentId);
assert.equal(manifest.vault_id, vault.vault_id);
assert.ok(manifest.grants.agent_secrets.some(g => g.secret_id === crmRecord.secret_id));
assert.ok(manifest.grants.secret_destinations.some(g => g.site_id === "api.example.com"));

console.log("Agent introspection smoke test passed");
