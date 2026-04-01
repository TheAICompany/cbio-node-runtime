import assert from "node:assert/strict";
import {
  createOwnerClient,
  createIdentity,
} from "../../dist/runtime/index.js";
import {
  createVaultCore,
  DefaultPolicyEngine,
  HttpDispatchExecutor,
  InMemoryAgentIdentityRegistry,
  InMemoryAuditLog,
  InMemoryAgentSecretGrantRegistry,
  InMemorySecretDestinationGrantRegistry,
  InMemorySiteRegistry,
  InMemoryReplayGuard,
  InMemorySessionTokenRegistry,
  InMemoryRequestRecordRegistry,
  InMemorySecretCustody,
  InMemorySecretRepository,
  RandomIdGenerator,
  SignatureAgentProofVerifier,
  SystemClock,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";
import { LocalSigner } from "../../dist/protocol/crypto.js";

const agentRecord = createIdentity();
const signer = new LocalSigner({ 
  publicKey: agentRecord.public_key, 
  privateKey: agentRecord.private_key 
});
const replayAgentIdentities = new InMemoryAgentIdentityRegistry();
const replaySessionTokenRegistry = new InMemorySessionTokenRegistry();
const authority = createVaultCore({
  vault_id: "vault-replay",
  secrets: new InMemorySecretRepository(),
  custody: new InMemorySecretCustody(),
  policy: new DefaultPolicyEngine(),
  audit: new InMemoryAuditLog(),
  executor: {
      dispatch: async () => ({
          status: "SUCCEEDED",
          response_status: 200,
          response_body: "ok"
      })
  },
  agentRecords: replayAgentIdentities,
  agentProofVerifier: new SignatureAgentProofVerifier(replayAgentIdentities, replaySessionTokenRegistry),
  agent_secretGrants: new InMemoryAgentSecretGrantRegistry(),
  secret_destinationGrants: new InMemorySecretDestinationGrantRegistry(),
  sites: new InMemorySiteRegistry(),
  sessionTokenRegistry: replaySessionTokenRegistry,
  replayGuard: new InMemoryReplayGuard(),
  clock: new SystemClock(),
  ids: new RandomIdGenerator(),
  requests: new InMemoryRequestRecordRegistry(),
});
const vault = wrapVaultCoreAsVaultService(authority);

const client = await createOwnerClient({
  vault,
  skipWarmup: true,
});

const importedAgent = await client.ownerImportAgent({
  private_key: agentRecord.private_key,
});
const vaultAgentId = importedAgent.agent.root_agent_id;

const secret = await client.ownerCreateSecret({
  alias: "replay-token",
  plaintext: "replay-secret",
  requested_at: new Date().toISOString(),
});
const secret_id = secret.secret_id;

// Use new Grant APIs
await client.ownerGrantAgentSecret({
  root_agent_id: vaultAgentId,
  secret_alias: "replay-token",
});
await client.ownerCreateSite({ domain: "allowed.example.com" });
await client.ownerGrantSecretDestination({
  secret_alias: "replay-token",
  site_id: "allowed.example.com",
});

const request_id = "replay-request";
const requested_at = new Date().toISOString();
// Sign the dispatch intent
const target_url = "https://allowed.example.com/replay";
const method = "POST";
const binding = JSON.stringify({
  request_id,
  requested_at,
  root_agent_id: vaultAgentId,
  secret_id,
  target_url,
  method,
  body: null,
});
const signature = await signer.sign(binding);

const request = {
  vault_id: authority.vault_id,
  request_id,
  requested_at,
  agent: { kind: "agent", id: vaultAgentId },
  proof: {
    root_agent_id: vaultAgentId,
    signature,
    request_id,
    requested_at,
  },
  secret_id,
  target_url,
  method,
  reason: "Need to verify replay protection on repeated dispatch.",
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

const replayAudit = await client.ownerReadAudit({ secret_id });
assert.ok(replayAudit.some((entry) => entry.error && /replay/.test(entry.error)));

console.log("replay guard smoke test passed");
