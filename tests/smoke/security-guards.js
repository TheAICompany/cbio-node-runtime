import assert from "node:assert/strict";
import {
  createOwnerClient,
  createIdentity,
} from "../../dist/runtime/index.js";
import {
  createVaultCore,
  createVaultCoreDependencies,
  InMemoryAgentSecretGrantRegistry,
  InMemorySecretDestinationGrantRegistry,
  InMemoryRequestRecordRegistry,
  VaultCoreError,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";
import { LocalSigner } from "../../dist/protocol/crypto.js";

const agentRecord = createIdentity();
const signer = new LocalSigner({
  publicKey: agentRecord.public_key,
  privateKey: agentRecord.private_key,
});

const authority = createVaultCore(createVaultCoreDependencies({
  vault_id: "vault-security",
  fetchImpl: async () => new Response("ok", { status: 200 }),
  agent_secretGrants: new InMemoryAgentSecretGrantRegistry(),
  secret_destinationGrants: new InMemorySecretDestinationGrantRegistry(),
}));
const vault = wrapVaultCoreAsVaultService(authority);

const client = await createOwnerClient({
  vault,
});
const importedAgent = await client.ownerImportAgent({
  private_key: agentRecord.private_key,
});
const vaultAgentId = importedAgent.agent.root_agent_id;

const guardedRecord = await client.ownerCreateSecret({
  alias: "guarded-token",
  plaintext: "guarded-secret",
});

// Case 1: Expired requested_at (Security Guard: Clock Skew)
const expiredRequestedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
const expiredRequestId = "expired-request";
const secret_id = guardedRecord.secret_id;
const expiredSignature = await signer.sign(JSON.stringify({
  request_id: expiredRequestId,
  requested_at: expiredRequestedAt,
  root_agent_id: vaultAgentId,
  secret_id,
  target_url: "https://guarded.example.com/endpoint",
  method: "POST",
  body: null,
}));

await assert.rejects(
  () => authority.agentDispatchSecret({
    vault_id: authority.vault_id,
    request_id: expiredRequestId,
    requested_at: expiredRequestedAt,
    agent: { kind: "agent", id: vaultAgentId },
    proof: {
      root_agent_id: vaultAgentId,
      signature: expiredSignature,
      request_id: expiredRequestId,
      requested_at: expiredRequestedAt,
    },
    secret_id,
    target_url: "https://guarded.example.com/endpoint",
    method: "POST",
    reason: "Need to verify expired timestamp rejection.",
  }),
  (error) => {
    assert.equal(error instanceof VaultCoreError, true);
    assert.equal(error.code, "VAULT_DISPATCH_DENIED");
    assert.match(error.message, /timestamp out of range/);
    return true;
  },
);

// Case 2: Signature Mismatch (Tampered Body)
const validRequestedAt = new Date().toISOString();
const validRequestId = "valid-security-request";
const badBinding = JSON.stringify({
  request_id: validRequestId,
  requested_at: validRequestedAt,
  root_agent_id: vaultAgentId,
  secret_id,
  target_url: "https://guarded.example.com/endpoint",
  method: "POST",
  body: "tampered", // Binding includes "tampered"
});
const badSignature = await signer.sign(badBinding);

await assert.rejects(
  () => authority.agentDispatchSecret({
    vault_id: authority.vault_id,
    request_id: validRequestId,
    requested_at: validRequestedAt,
    agent: { kind: "agent", id: vaultAgentId },
    proof: {
      root_agent_id: vaultAgentId,
      signature: badSignature,
      request_id: validRequestId,
      requested_at: validRequestedAt,
    },
    secret_id,
    target_url: "https://guarded.example.com/endpoint",
    method: "POST",
    body: null, // But actual body is null -> Binding Mismatch
    reason: "Need to verify signature mismatch rejection.",
  }),
  (error) => {
    assert.equal(error instanceof VaultCoreError, true);
    assert.equal(error.code, "VAULT_DISPATCH_DENIED");
    assert.match(error.message, /invalid proof signature/);
    return true;
  },
);

const securityAudit = await client.ownerReadAudit({ secret_id });
assert.ok(securityAudit.some((entry) => entry.output?.status === "denied" && /timestamp out of range|invalid proof signature/.test(entry.output?.detail || "")));

// Case 3: Unauthorized Identity Registration (non-owner principal)
const unauthorizedIdentityRequestId = "unauthorized-agent-registration";
const unauthorizedIdentityRequestedAt = new Date().toISOString();
await assert.rejects(
  () => authority.ownerRegisterAgentIdentity({
    vault_id: authority.vault_id,
    request_id: unauthorizedIdentityRequestId,
    owner: { kind: "agent", id: "not-an-owner" },
    agentRecord: {
      vault_id: authority.vault_id,
      root_agent_id: "agent-forged",
      public_key: agentRecord.public_key,
    },
    requested_at: unauthorizedIdentityRequestedAt,
  }),
  (error) => {
    assert.equal(error instanceof VaultCoreError, true);
    assert.equal(error.code, "VAULT_ACCESS_DENIED");
    return true;
  },
);

// Case 4: Unauthorized Audit Access
await assert.rejects(
  () => authority.ownerReadAudit(
    { kind: "agent", id: "not-an-owner" },
    { secret_id },
  ),
  (error) => {
    assert.equal(error instanceof VaultCoreError, true);
    assert.equal(error.code, "VAULT_ACCESS_DENIED");
    return true;
  },
);


// Case 5: 重复创建秘密（严格 Create 语义：重复别名必须失败）
await assert.rejects(
  () => client.ownerCreateSecret({
    alias: "guarded-token", // 与 line 39 已创建的同名
    plaintext: "should-be-rejected",
  }),
  (error) => {
    assert.equal(error instanceof VaultCoreError, true);
    assert.equal(error.code, "VAULT_ALIAS_ALREADY_EXISTS");
    return true;
  },
);

console.log("security guards smoke test passed");

