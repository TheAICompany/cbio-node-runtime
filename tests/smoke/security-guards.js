import assert from "node:assert/strict";
import {
  createVaultClient,
  createIdentity,
} from "../../dist/runtime/index.js";
import {
  createVaultCore,
  createDefaultVaultCoreDependencies,
  VaultCoreError,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";
import { LocalSigner } from "../../dist/protocol/crypto.js";

const agentIdentity = createIdentity();
const signer = new LocalSigner(agentIdentity);

const authority = createVaultCore(createDefaultVaultCoreDependencies({
  vaultId: "vault-security",
  fetchImpl: async () => new Response("ok", { status: 200 }),
}));
const vault = wrapVaultCoreAsVaultService(authority);

const client = createVaultClient({
  vault,
});
const importedAgent = await client.ownerImportAgent({
  privateKey: agentIdentity.privateKey,
});
const vaultAgentId = importedAgent.agent.agentId;

const guardedRecord = await client.ownerWriteSecret({
  alias: "guarded-token",
  plaintext: "guarded-secret",
  targetBindings: [
    {
      kind: "site",
      targetId: "guarded-site",
      targetUrl: "https://guarded.example.com/endpoint",
      methods: ["POST"],
    },
  ],
});

const expiredRequestedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
const expiredRequestId = "expired-request";
const expiredBinding = JSON.stringify({
  requestId: expiredRequestId,
  requestedAt: expiredRequestedAt,
  agentId: vaultAgentId,
  capabilityId: "cap-expired",
  secretAlias: "guarded-token",
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
    capability: {
      vaultId: authority.vaultId,
      capabilityId: "cap-expired",
      agentId: vaultAgentId,
      secretIds: [guardedRecord.secretId.value],
      operation: "dispatch_http",
      scope: "https://guarded.example.com/endpoint",
      methods: ["POST"],
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      auditRequired: true,
    },
    proof: {
      agentId: vaultAgentId,
      signature: expiredSignature,
      requestId: expiredRequestId,
      requestedAt: expiredRequestedAt,
    },
    secretAlias: "guarded-token",
    targetUrl: "https://guarded.example.com/endpoint",
    method: "POST",
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
  agentId: vaultAgentId,
  capabilityId: "cap-valid",
  secretAlias: "guarded-token",
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
    capability: {
      vaultId: authority.vaultId,
      capabilityId: "cap-valid",
      agentId: vaultAgentId,
      secretIds: [guardedRecord.secretId.value],
      operation: "dispatch_http",
      scope: "https://guarded.example.com/endpoint",
      methods: ["POST"],
      issuedAt: new Date().toISOString(),
      auditRequired: true,
    },
    proof: {
      agentId: vaultAgentId,
      signature: badSignature,
      requestId: validRequestId,
      requestedAt: validRequestedAt,
    },
    secretAlias: "guarded-token",
    targetUrl: "https://guarded.example.com/endpoint",
    method: "POST",
    body: null,
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
    agentIdentity: {
      vaultId: authority.vaultId,
      agentId: "agent-forged",
      publicKey: agentIdentity.publicKey,
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
