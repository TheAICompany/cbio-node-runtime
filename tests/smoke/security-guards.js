import assert from "node:assert/strict";
import {
  createVaultClient,
  createVaultCore,
  createDefaultVaultCoreDependencies,
  wrapVaultCoreAsVaultService,
  VaultCoreError,
  LocalSigner,
  createIdentity,
} from "../../dist/runtime/index.js";

const agentIdentity = createIdentity();
const signer = new LocalSigner(agentIdentity);
const ownerIdentity = createIdentity();

const authority = createVaultCore(createDefaultVaultCoreDependencies({
  vaultId: "vault-security",
  fetchImpl: async () => new Response("ok", { status: 200 }),
}));
const vault = wrapVaultCoreAsVaultService(authority);
await authority.bootstrapOwnerIdentity({
  vaultId: authority.vaultId,
  ownerId: "owner-security",
  publicKey: ownerIdentity.publicKey,
});

const client = createVaultClient({ identityId: "owner-security" }, vault, new LocalSigner(ownerIdentity), {
  nowIso: () => new Date().toISOString(),
});
await client.registerAgent({
  agentId: "agent-security",
  publicKey: agentIdentity.publicKey,
});

const guardedRecord = await client.writeSecret({
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
  agentId: "agent-security",
  capabilityId: "cap-expired",
  secretAlias: "guarded-token",
  targetUrl: "https://guarded.example.com/endpoint",
  method: "POST",
  body: null,
});
const expiredSignature = await signer.sign(expiredBinding);

await assert.rejects(
  () => authority.dispatchSecret({
    vaultId: authority.vaultId,
    requestId: expiredRequestId,
    requestedAt: expiredRequestedAt,
    agent: { kind: "agent", id: "agent-security" },
    capability: {
      vaultId: authority.vaultId,
      capabilityId: "cap-expired",
      agentId: "agent-security",
      secretIds: [guardedRecord.secretId.value],
      operation: "dispatch_http",
      allowedTargets: ["https://guarded.example.com/endpoint"],
      allowedMethods: ["POST"],
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      auditRequired: true,
    },
    proof: {
      agentId: "agent-security",
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
  agentId: "agent-security",
  capabilityId: "cap-valid",
  secretAlias: "guarded-token",
  targetUrl: "https://guarded.example.com/endpoint",
  method: "POST",
  body: "tampered",
});
const badSignature = await signer.sign(badBinding);

await assert.rejects(
  () => authority.dispatchSecret({
    vaultId: authority.vaultId,
    requestId: validRequestId,
    requestedAt: validRequestedAt,
    agent: { kind: "agent", id: "agent-security" },
    capability: {
      vaultId: authority.vaultId,
      capabilityId: "cap-valid",
      agentId: "agent-security",
      secretIds: [guardedRecord.secretId.value],
      operation: "dispatch_http",
      allowedTargets: ["https://guarded.example.com/endpoint"],
      allowedMethods: ["POST"],
      issuedAt: new Date().toISOString(),
      auditRequired: true,
    },
    proof: {
      agentId: "agent-security",
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

const securityAudit = await client.readAudit({ secretAlias: "guarded-token" });
assert.ok(securityAudit.some((entry) => entry.outcome === "denied" && /expired|binding mismatch|timestamp out of range|invalid proof signature/.test(entry.detail)));

const unauthorizedIdentityRequestId = "unauthorized-agent-registration";
const unauthorizedIdentityRequestedAt = new Date().toISOString();
await assert.rejects(
  () => authority.registerAgentIdentity({
    vaultId: authority.vaultId,
    requestId: unauthorizedIdentityRequestId,
    owner: { kind: "owner", id: "owner-security" },
    agentIdentity: {
      vaultId: authority.vaultId,
      agentId: "agent-forged",
      publicKey: agentIdentity.publicKey,
    },
    requestedAt: unauthorizedIdentityRequestedAt,
    proof: {
      ownerId: "owner-security",
      requestId: unauthorizedIdentityRequestId,
      requestedAt: unauthorizedIdentityRequestedAt,
      signature: "forged-signature",
    },
  }),
  (error) => {
    assert.equal(error instanceof VaultCoreError, true);
    assert.equal(error.code, "VAULT_IDENTITY_DENIED");
    return true;
  },
);

await assert.rejects(
  () => authority.getAudit(
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
  () => authority.exportSecret(
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
