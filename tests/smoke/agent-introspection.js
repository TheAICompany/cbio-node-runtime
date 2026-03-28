import assert from "node:assert/strict";
import {
  createOwnerClient,
  createAgentClient,
  createIdentity,
  handleVaultAgentControlHttp,
} from "../../dist/runtime/index.js";
import {
  createVaultCoreDependencies,
  createVaultCore,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";

const deps = createVaultCoreDependencies({
  vaultId: "vault-agent-introspection",
  fetchImpl: async () => new Response("ok", { status: 200 }),
});
const authority = createVaultCore(deps);
const vault = wrapVaultCoreAsVaultService(authority);
const ownerClient = createOwnerClient({ vault, skipWarmup: true });

const agentRecord = createIdentity({ nickname: "introspector" });
const importedAgent = await ownerClient.ownerImportAgent({
  privateKey: agentRecord.privateKey,
});
const vaultAgentId = importedAgent.agent.rootAgentId;
const crmRecord = await ownerClient.ownerCreateSecret({
  alias: "crm-token",
  plaintext: "secret-crm-token",
});
await ownerClient.ownerCreateSecret({
  alias: "payroll-token",
  plaintext: "secret-payroll-token",
});
await ownerClient.ownerGrantGrant({
  rootAgentId: vaultAgentId,
  write: {
    secretIds: [crmRecord.secretId.value],
    scope: "https://api.example.com/users/*",
    methods: ["GET"],
  },
  read: { paths: ["$"] },
});

const capabilities = await ownerClient.ownerListCapabilities({ rootAgentId: vaultAgentId });
const session = await ownerClient.ownerIssueSessionToken({ rootAgentId: vaultAgentId });
const agentClient = createAgentClient({
  agentRecord: { rootAgentId: vaultAgentId },
  grant: capabilities[0],
  vault,
  token: session.token,
});

const visibleCapabilities = await agentClient.agentListCapabilities();
assert.equal(visibleCapabilities.length, 1);
assert.equal(visibleCapabilities[0].status, "GRANTED");
assert.equal(visibleCapabilities[0].write.scope, "https://api.example.com/users/*");

const visibleSecrets = await agentClient.agentListSecrets();
assert.equal(visibleSecrets.length, 2);
assert.equal(visibleSecrets.find((record) => record.alias.value === "crm-token")?.isAuthorizedForAgent, true);
assert.equal(visibleSecrets.find((record) => record.alias.value === "payroll-token")?.isAuthorizedForAgent, false);

const requestedAt = new Date().toISOString();
const requestId = `${agentRecord.rootAgentId}:${requestedAt}:submit_grant_request`;

const httpResult = await handleVaultAgentControlHttp(vault, {
  action: "submit_grant_request",
  vaultId: vault.vaultId.value,
  requestId,
  requestedAt,
  rootAgentId: vaultAgentId,
  proof: { token: session.token },
  operation: "dispatch_http",
  write: {
    secretIds: [crmRecord.secretId.value],
    scope: "https://api.example.com/admin/*",
    methods: ["POST"],
  },
  read: { paths: ["$"] },
  reason: "Need admin write access",
});

assert.equal(httpResult.ok, true);
const pending = await ownerClient.ownerListGrantStates({ writeGranted: false });
assert.equal(pending.length, 1);
assert.equal(pending[0].write.scope, "https://api.example.com/admin/*");

const manifest = await agentClient.agentIntrospect();
assert.equal(manifest.agent.rootAgentId, vaultAgentId);
assert.equal(manifest.agent.rootAgentId, importedAgent.agent.rootAgentId);
assert.equal(manifest.agent.publicKey, importedAgent.agent.publicKey);
assert.equal(manifest.capabilities.some((entry) => entry.writeGrant === "always" && entry.write.scope === "https://api.example.com/users/*"), true);
assert.equal(
  manifest.capabilities.some((entry) =>
    entry.writeGrant === null
    && entry.source === "explicit_request"
    && entry.write.scope === "https://api.example.com/admin/*"
  ),
  true,
);

const grantView = await agentClient.agentListCapabilities();
assert.equal(
  grantView.some((entry) => entry.writeGrant === null && entry.write.scope === "https://api.example.com/admin/*"),
  true,
);

console.log("Agent introspection smoke test passed");
