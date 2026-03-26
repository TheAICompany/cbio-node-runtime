import assert from "node:assert/strict";
import {
  createVaultClient,
  createIdentity,
} from "../../dist/runtime/index.js";
import {
  createVaultCore,
  DefaultPolicyEngine,
  HttpDispatchExecutor,
  InMemoryAgentIdentityRegistry,
  InMemoryAuditLog,
  InMemoryCapabilityRegistry,
  InMemoryCustomHttpFlowRegistry,
  InMemoryPendingCapabilityRequestRegistry,
  InMemoryPendingRequestRegistry,
  InMemoryReplayGuard,
  InMemorySessionTokenRegistry,
  InMemorySecretCustody,
  InMemorySecretRepository,
  RandomIdGenerator,
  SignatureAgentProofVerifier,
  SystemClock,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";
import { LocalSigner } from "../../dist/protocol/crypto.js";

const agentIdentity = createIdentity();
const signer = new LocalSigner(agentIdentity);
const replayAgentIdentities = new InMemoryAgentIdentityRegistry();
const replaySessionTokens = new InMemorySessionTokenRegistry();
const authority = createVaultCore({
  vaultId: { value: "vault-replay" },
  secrets: new InMemorySecretRepository(),
  custody: new InMemorySecretCustody(),
  policy: new DefaultPolicyEngine(),
  audit: new InMemoryAuditLog(),
  executor: new HttpDispatchExecutor(async () => new Response("ok", { status: 200 })),
  agentIdentities: replayAgentIdentities,
  agentProofVerifier: new SignatureAgentProofVerifier(replayAgentIdentities, replaySessionTokens),
  capabilities: new InMemoryCapabilityRegistry(),
  customFlows: new InMemoryCustomHttpFlowRegistry(),
  sessionTokens: replaySessionTokens,
  pendingRequests: new InMemoryPendingRequestRegistry(),
  pendingCapabilityRequests: new InMemoryPendingCapabilityRequestRegistry(),
  replayGuard: new InMemoryReplayGuard(),
  clock: new SystemClock(),
  ids: new RandomIdGenerator(),
});
const vault = wrapVaultCoreAsVaultService(authority);

const client = createVaultClient({
  vault,
  skipWarmup: true,
});
const importedAgent = await client.ownerImportAgent({
  privateKey: agentIdentity.privateKey,
});
const vaultAgentId = importedAgent.agent.agentId;

const replayRecord = await client.ownerWriteSecret({
  alias: "replay-token",
  plaintext: "replay-secret",
  targetBindings: [
    {
      kind: "site",
      targetId: "allowed",
      targetUrl: "https://allowed.example.com/replay",
      methods: ["POST"],
    },
  ],
  requestedAt: new Date().toISOString(),
});

await client.ownerGrantCapability({
  agentId: vaultAgentId,
  secretAliases: ["replay-token"],
  scope: "https://allowed.example.com/replay",
  methods: ["POST"],
});

const requestId = "replay-request";
const requestedAt = new Date().toISOString();
const binding = JSON.stringify({
  requestId,
  requestedAt,
  agentId: vaultAgentId,
  capabilityId: "cap-replay",
  secretAlias: "replay-token",
  targetUrl: "https://allowed.example.com/replay",
  method: "POST",
  body: null,
});
const signature = await signer.sign(binding);

const request = {
  vaultId: authority.vaultId,
  requestId,
  requestedAt,
  agent: { kind: "agent", id: vaultAgentId },
  capability: {
    vaultId: authority.vaultId,
    capabilityId: "cap-replay",
    agentId: vaultAgentId,
    secretIds: [replayRecord.secretId.value],
    operation: "dispatch_http",
    scope: "https://allowed.example.com/replay",
    methods: ["POST"],
    issuedAt: new Date().toISOString(),
    auditRequired: true,
  },
  proof: {
    agentId: vaultAgentId,
    signature,
    requestId,
    requestedAt,
  },
  secretAlias: "replay-token",
  targetUrl: "https://allowed.example.com/replay",
  method: "POST",
};

const first = await authority.agentDispatchSecret(request);
assert.equal(first.status, "SUCCEEDED");

await assert.rejects(
  () => authority.agentDispatchSecret(request),
  (error) => {
    assert.equal(error?.code, "VAULT_DISPATCH_DENIED");
    assert.match(String(error?.message), /request replay detected/);
    return true;
  },
);

const replayAudit = await client.ownerReadAudit({ secretAlias: "replay-token" });
assert.ok(replayAudit.some((entry) => entry.outcome === "DENIED" && /replay/.test(entry.detail)));

console.log("replay guard smoke test passed");
