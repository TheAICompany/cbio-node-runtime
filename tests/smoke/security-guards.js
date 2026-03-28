import assert from "node:assert/strict";
import {
  createOwnerClient,
  createIdentity,
} from "../../dist/runtime/index.js";
import {
  createVaultCore,
  createVaultCoreDependencies,
  VaultCoreError,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";
import { LocalSigner } from "../../dist/protocol/crypto.js";

const agentRecord = createIdentity();
const signer = new LocalSigner(agentRecord);

const authority = createVaultCore(createVaultCoreDependencies({
  vaultId: "vault-security",
  fetchImpl: async () => new Response("ok", { status: 200 }),
}));
const vault = wrapVaultCoreAsVaultService(authority);

const client = createOwnerClient({
  vault,
});
const importedAgent = await client.ownerImportAgent({
  privateKey: agentRecord.privateKey,
});
const vaultAgentId = importedAgent.agent.id;

const guardedRecord = await client.ownerCreateSecret({
  alias: "guarded-token",
  plaintext: "guarded-secret",
});

const expiredRequestedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
const expiredRequestId = "expired-request";
const expiredBinding = JSON.stringify({
  requestId: expiredRequestId,
  requestedAt: expiredRequestedAt,
  rootAgentId: vaultAgentId,
  grantId: "cap-expired",
  secretId: guardedRecord.secretId.value,
  targetUrl: "https://guarded.example.com/endpoint",
  method: "POST",
  body: null,
});
const expiredSignature = await signer.sign(expiredBinding);

await assert.rejects(
  () => authority.agentDispatchSecret({
    vaultId: authority.vaultId,
    requestId: expiredRequestId,
    requestedAt: expiredRequestedAt,
    agent: { kind: "agent", id: vaultAgentId },
    grant: {
      vaultId: authority.vaultId,
      grantId: "cap-expired",
      rootAgentId: vaultAgentId,
      operation: "dispatch_http",
      write: {
        secretIds: [guardedRecord.secretId.value],
        scope: "https://guarded.example.com/endpoint",
        methods: ["POST"],
      },
      read: { paths: ["$"] },
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      auditRequired: true,
    },
    proof: {
      rootAgentId: vaultAgentId,
      signature: expiredSignature,
      requestId: expiredRequestId,
      requestedAt: expiredRequestedAt,
    },
    secretId: guardedRecord.secretId.value,
    targetUrl: "https://guarded.example.com/endpoint",
    method: "POST",
    reason: "Need to verify expired grant rejection.",
  }),
  (error) => {
    assert.equal(error instanceof VaultCoreError, true);
    assert.equal(error.code, "VAULT_DISPATCH_DENIED");
    return true;
  },
);

const validRequestedAt = new Date().toISOString();
const validRequestId = "valid-security-request";
const badBinding = JSON.stringify({
  requestId: validRequestId,
  requestedAt: validRequestedAt,
  rootAgentId: vaultAgentId,
  grantId: "cap-valid",
  secretId: guardedRecord.secretId.value,
  targetUrl: "https://guarded.example.com/endpoint",
  method: "POST",
  body: "tampered",
});
const badSignature = await signer.sign(badBinding);

await assert.rejects(
  () => authority.agentDispatchSecret({
    vaultId: authority.vaultId,
    requestId: validRequestId,
    requestedAt: validRequestedAt,
    agent: { kind: "agent", id: vaultAgentId },
    grant: {
      vaultId: authority.vaultId,
      grantId: "cap-valid",
      rootAgentId: vaultAgentId,
      operation: "dispatch_http",
      write: {
        secretIds: [guardedRecord.secretId.value],
        scope: "https://guarded.example.com/endpoint",
        methods: ["POST"],
      },
      read: { paths: ["$"] },
      issuedAt: new Date().toISOString(),
      auditRequired: true,
    },
    proof: {
      rootAgentId: vaultAgentId,
      signature: badSignature,
      requestId: validRequestId,
      requestedAt: validRequestedAt,
    },
    secretId: guardedRecord.secretId.value,
    targetUrl: "https://guarded.example.com/endpoint",
    method: "POST",
    body: null,
    reason: "Need to verify signature mismatch rejection.",
  }),
  (error) => {
    assert.equal(error instanceof VaultCoreError, true);
    assert.equal(error.code, "VAULT_DISPATCH_DENIED");
    return true;
  },
);

const securityAudit = await client.ownerReadAudit({ secretAlias: "guarded-token" });
assert.ok(securityAudit.some((entry) => entry.outcome === "DENIED" && /expired|binding mismatch|timestamp out of range|invalid proof signature/.test(entry.detail)));

// Sovereign Vault: identity registration for unlocked vault is implicitly authorized.
// We only check for vault ID mismatch.
const unauthorizedIdentityRequestId = "unauthorized-agent-registration";
const unauthorizedIdentityRequestedAt = new Date().toISOString();
await assert.rejects(
  () => authority.ownerRegisterAgentIdentity({
    vaultId: { value: "mismatch-vault" },
    requestId: unauthorizedIdentityRequestId,
    owner: { kind: "owner", id: "vault-master" },
    agentRecord: {
      vaultId: authority.vaultId,
      rootAgentId: "agent-forged",
      publicKey: agentRecord.publicKey,
    },
    requestedAt: unauthorizedIdentityRequestedAt,
  }),
  (error) => {
    assert.equal(error instanceof VaultCoreError, true);
    assert.equal(error.code, "VAULT_IDENTITY_DENIED");
    return true;
  },
);

await assert.rejects(
  () => authority.ownerReadAudit(
    { kind: "trusted_executor", id: "not-an-owner" },
    { secretAlias: "guarded-token" },
  ),
  (error) => {
    assert.equal(error instanceof VaultCoreError, true);
    assert.equal(error.code, "VAULT_AUDIT_DENIED");
    return true;
  },
);

await assert.rejects(
  () => authority.ownerExportSecret(
    { kind: "owner", id: "owner-security" },
    "guarded-token",
  ),
  (error) => {
    assert.equal(error instanceof VaultCoreError, true);
    assert.equal(error.code, "VAULT_AUDIT_DENIED");
    return true;
  },
);

console.log("security guards smoke test passed");
