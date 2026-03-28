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

const agentIdentity = createIdentity({ nickname: "introspector" });
const importedAgent = await ownerClient.ownerImportAgent({
  privateKey: agentIdentity.privateKey,
});
const vaultAgentId = importedAgent.agent.agentId;
const crmRecord = await ownerClient.ownerCreateSecret({
  alias: "crm-token",
  plaintext: "secret-crm-token",
});
await ownerClient.ownerCreateSecret({
  alias: "payroll-token",
  plaintext: "secret-payroll-token",
});
await ownerClient.ownerGrantCapability({
  agentId: vaultAgentId,
  write: {
    secretIds: [crmRecord.secretId.value],
    scope: "https://api.example.com/users/*",
    methods: ["GET"],
  },
  read: { paths: ["$"] },
});

const capabilities = await ownerClient.ownerListCapabilities({ agentId: vaultAgentId });
const session = await ownerClient.ownerIssueSessionToken({ agentId: vaultAgentId });
const agentClient = createAgentClient({
  agentIdentity: { agentId: vaultAgentId },
  capability: capabilities[0],
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
const requestId = `${agentIdentity.rootAgentId}:${requestedAt}:submit_capability_request`;

const httpResult = await handleVaultAgentControlHttp(vault, {
  action: "submit_capability_request",
  vaultId: vault.vaultId.value,
  requestId,
  requestedAt,
  agentId: vaultAgentId,
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
const pending = await ownerClient.ownerListCapabilityStates({ writeGranted: false });
assert.equal(pending.length, 1);
assert.equal(pending[0].write.scope, "https://api.example.com/admin/*");

const manifest = await agentClient.agentIntrospect();
assert.equal(manifest.agent.agentId, vaultAgentId);
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

const capabilityView = await agentClient.agentListCapabilities();
assert.equal(
  capabilityView.some((entry) => entry.writeGrant === null && entry.write.scope === "https://api.example.com/admin/*"),
  true,
);

console.log("Agent introspection smoke test passed");
