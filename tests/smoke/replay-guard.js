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
  InMemoryCustomHttpFlowRegistry,
  InMemoryOwnerIdentityRegistry,
  InMemoryReplayGuard,
  InMemorySecretCustody,
  InMemorySecretRepository,
  RandomIdGenerator,
  SignatureAgentProofVerifier,
  SignatureOwnerProofVerifier,
  SystemClock,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";
import { LocalSigner } from "../../dist/protocol/crypto.js";

const agentIdentity = createIdentity();
const signer = new LocalSigner(agentIdentity);
const ownerIdentity = createIdentity();
const replayAgentIdentities = new InMemoryAgentIdentityRegistry();
const replayOwnerIdentities = new InMemoryOwnerIdentityRegistry();
const authority = createVaultCore({
  vaultId: { value: "vault-replay" },
  secrets: new InMemorySecretRepository(),
  custody: new InMemorySecretCustody(),
  policy: new DefaultPolicyEngine(),
  audit: new InMemoryAuditLog(),
  executor: new HttpDispatchExecutor(async () => new Response("ok", { status: 200 })),
  agentIdentities: replayAgentIdentities,
  ownerIdentities: replayOwnerIdentities,
  proofVerifier: new SignatureAgentProofVerifier(replayAgentIdentities),
  ownerProofVerifier: new SignatureOwnerProofVerifier(replayOwnerIdentities),
  customFlows: new InMemoryCustomHttpFlowRegistry(),
  replayGuard: new InMemoryReplayGuard(),
  clock: new SystemClock(),
  ids: new RandomIdGenerator(),
});
const vault = wrapVaultCoreAsVaultService(authority);
await authority.bootstrapOwnerIdentity({
  vaultId: authority.vaultId,
  ownerId: "owner-replay",
  publicKey: ownerIdentity.publicKey,
});

const client = createVaultClient({
  ownerIdentity: { identityId: "owner-replay" },
  vault,
  signer: new LocalSigner(ownerIdentity),
  clock: new SystemClock(),
});
await client.registerAgent({
  agentId: "agent-replay",
  publicKey: agentIdentity.publicKey,
});

const replayRecord = await client.writeSecret({
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

const requestId = "replay-request";
const requestedAt = new Date().toISOString();
const binding = JSON.stringify({
  requestId,
  requestedAt,
  agentId: "agent-replay",
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
  agent: { kind: "agent", id: "agent-replay" },
  capability: {
    vaultId: authority.vaultId,
    capabilityId: "cap-replay",
    agentId: "agent-replay",
    secretIds: [replayRecord.secretId.value],
    operation: "dispatch_http",
    allowedTargets: ["https://allowed.example.com/replay"],
    allowedMethods: ["POST"],
    issuedAt: new Date().toISOString(),
    auditRequired: true,
  },
  proof: {
    agentId: "agent-replay",
    signature,
    requestId,
    requestedAt,
  },
  secretAlias: "replay-token",
  targetUrl: "https://allowed.example.com/replay",
  method: "POST",
};

const first = await authority.dispatchSecret(request);
assert.equal(first.status, "succeeded");

await assert.rejects(
  () => authority.dispatchSecret(request),
  (error) => {
    assert.equal(error?.code, "VAULT_DISPATCH_DENIED");
    assert.match(String(error?.message), /request replay detected/);
    return true;
  },
);

const replayAudit = await client.readAudit({ secretAlias: "replay-token" });
assert.ok(replayAudit.some((entry) => entry.outcome === "denied" && /replay/.test(entry.detail)));

console.log("replay guard smoke test passed");
