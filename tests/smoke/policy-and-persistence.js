import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createAgentClient,
  createVaultClient,
  FsStorageProvider,
  createIdentity,
} from "../../dist/runtime/index.js";
import {
  VaultCoreError,
  createVaultCore,
  createPersistentVaultCoreDependencies,
  initializeVaultCustody,
  recoverVaultWorkingKey,
  DefaultPolicyEngine,
  HttpDispatchExecutor,
  InMemoryAgentIdentityRegistry,
  PersistentVaultSecretCustody,
  PersistentVaultAuditLog,
  PersistentVaultSecretRepository,
  RandomIdGenerator,
  SignatureAgentProofVerifier,
  SystemClock,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";
import { LocalVaultTransport } from "../../dist/vault-ingress/defaults.js";
import { LocalSigner } from "../../dist/protocol/crypto.js";

const tempDir = await mkdtemp(join(tmpdir(), "cbio-policy-"));

try {
  const storage = new FsStorageProvider(tempDir);
  const initializedCustody = await initializeVaultCustody(storage);
  const vaultWorkingKey = initializedCustody.vaultWorkingKey;
  assert.equal(await recoverVaultWorkingKey(storage, initializedCustody.vaultRecoveryKey), vaultWorkingKey);
  const policyAgentIdentities = new InMemoryAgentIdentityRegistry();
  const persistentDeps = createPersistentVaultCoreDependencies(storage, {
    vaultId: "vault-policy",
    vaultWorkingKey,
  });
  const revocations = persistentDeps.capabilityRevocations;
  const authority = createVaultCore({
    ...persistentDeps,
    executor: new HttpDispatchExecutor(async () => new Response("ok", { status: 200 })),
    agentIdentities: policyAgentIdentities,
    agentProofVerifier: new SignatureAgentProofVerifier(policyAgentIdentities, persistentDeps.sessionTokens, { maxSkewMs: 60_000 }),
  });
  const vault = wrapVaultCoreAsVaultService(authority);

  const client = createVaultClient({
    vault,
    passwordVerifier: async (password) => password === "policy-password",
  });
  const unscopedRecord = await client.ownerCreateSecret({
    alias: "unscoped-token",
    plaintext: "secret-0",
  });
  assert.deepEqual(unscopedRecord.source, { kind: "manual" });

  const unscopedArrayRecord = await client.ownerCreateSecret({
    alias: "unscoped-array-token",
    plaintext: "secret-0b",
  });
  assert.deepEqual(unscopedArrayRecord.source, { kind: "manual" });

  const storedThenDefinedRecord = await client.ownerCreateSecret({
    alias: "stored-then-defined-token",
    plaintext: "secret-1",
  });
  assert.deepEqual(storedThenDefinedRecord.source, { kind: "manual" });

  const restrictedRecord = await client.ownerCreateSecret({
    alias: "restricted-token",
    plaintext: "secret-2",
  });
  assert.deepEqual(restrictedRecord.source, { kind: "manual" });

  const agentIdentity = createIdentity();
  const importedAgent = await client.ownerImportAgent({
    privateKey: agentIdentity.privateKey,
  });
  const vaultAgentId = importedAgent.agent.agentId;
  const restrictedCapability = {
    vaultId: authority.vaultId,
    capabilityId: "cap-restricted",
    agentId: vaultAgentId,
    operation: "dispatch_http",
    write: {
      secretIds: [restrictedRecord.secretId.value],
      scope: "https://allowed.example.com/resource",
      methods: ["POST"],
    },
    read: { paths: ["$"] },
    issuedAt: new Date().toISOString(),
    auditRequired: true,
  };
  await client.ownerGrantCapability({ capability: restrictedCapability });
  const storedThenDefinedCapability = {
    vaultId: authority.vaultId,
    capabilityId: "cap-stored-then-defined",
    agentId: vaultAgentId,
    operation: "dispatch_http",
    write: {
      secretIds: [storedThenDefinedRecord.secretId.value],
      scope: "https://allowed.example.com/resource",
      methods: ["POST"],
    },
    read: { paths: ["$"] },
    issuedAt: new Date().toISOString(),
    auditRequired: true,
  };
  await client.ownerGrantCapability({ capability: storedThenDefinedCapability });
  const session = await client.ownerIssueSessionToken({ agentId: vaultAgentId });

  const agent = createAgentClient({
    agentIdentity: { agentId: vaultAgentId },
    capability: {
      ...restrictedCapability,
    },
    transport: new LocalVaultTransport(vault),
    clock: new SystemClock(),
    token: session.token,
  });
  const storedThenDefinedAgent = createAgentClient({
    agentIdentity: { agentId: vaultAgentId },
    capability: {
      ...storedThenDefinedCapability,
    },
    transport: new LocalVaultTransport(vault),
    clock: new SystemClock(),
    token: session.token,
  });

  const unscopedResult = await agent.agentDispatch({
    secretAlias: "unscoped-token",
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    reason: "Need to verify the unscoped request behavior.",
  });
  assert.equal(unscopedResult.status, "PENDING");
  const storedThenDefinedResult = await storedThenDefinedAgent.agentDispatch({
    secretAlias: "stored-then-defined-token",
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    reason: "Need to verify the stored-then-defined secret path.",
  });
  assert.equal(storedThenDefinedResult.status, "SUCCEEDED");

  const deniedSiteResult = await agent.agentDispatch({
    secretAlias: "restricted-token",
    targetUrl: "https://denied.example.com/resource",
    method: "POST",
    reason: "Need to verify denial for the wrong site.",
  });
  assert.equal(deniedSiteResult.status, "PENDING");

  const audit = await client.ownerReadAudit({ secretAlias: "restricted-token" });
  assert.ok(audit.length >= 1);
  assert.ok(audit.some((entry) => entry.outcome === "PENDING" && /manual discovery approval/.test(entry.detail)));
  const exportedRestrictedSecret = await client.ownerExportSecret({ alias: "restricted-token", password: "policy-password" });
  assert.equal(exportedRestrictedSecret.plaintext, "secret-2");

  const otherPathResult = await agent.agentDispatch({
    secretAlias: "restricted-token",
    targetUrl: "https://allowed.example.com/other",
    method: "POST",
    reason: "Need to verify denial for the wrong path.",
  });
  assert.equal(otherPathResult.status, "PENDING");

  const rateLimitedCapability = {
    vaultId: authority.vaultId,
    capabilityId: "cap-limited",
    agentId: vaultAgentId,
    operation: "dispatch_http",
    write: {
      secretIds: [restrictedRecord.secretId.value],
      scope: "https://allowed.example.com/resource",
      methods: ["POST"],
    },
    read: { paths: ["$"] },
    issuedAt: new Date().toISOString(),
    rateLimit: {
      maxRequests: 1,
      windowMs: 60_000,
    },
    auditRequired: true,
  };
  await client.ownerGrantCapability({ capability: rateLimitedCapability });
  const rateLimitedAgent = createAgentClient({
    agentIdentity: { agentId: vaultAgentId },
    capability: {
      ...rateLimitedCapability,
    },
    transport: new LocalVaultTransport(vault),
    clock: new SystemClock(),
    token: session.token,
  });
  const firstLimited = await rateLimitedAgent.agentDispatch({
    secretAlias: "restricted-token",
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    reason: "Need to verify the first rate-limited request succeeds.",
  });
  assert.equal(firstLimited.status, "SUCCEEDED");
  await assert.rejects(
    () => rateLimitedAgent.agentDispatch({
      secretAlias: "restricted-token",
      targetUrl: "https://allowed.example.com/resource",
      method: "POST",
      reason: "Need to verify the second rate-limited request is blocked.",
    }),
    /VAULT_DISPATCH_DENIED|BROKER_GATEWAY_REJECTED/,
  );

  const revokedVersion = await revocations.revoke(authority.vaultId, vaultAgentId, "cap-restricted");
  assert.equal(revokedVersion, 1);
  await assert.rejects(
    () => agent.agentDispatch({
      secretAlias: "restricted-token",
      targetUrl: "https://allowed.example.com/resource",
      method: "POST",
      reason: "Need to verify revoked-capability behavior.",
    }),
    /VAULT_DISPATCH_DENIED|BROKER_GATEWAY_REJECTED/,
  );

  await assert.rejects(
    () => client.ownerCreateSecret({
      alias: "restricted-token",
      plaintext: "replacement-secret",
    }),
    (error) => error instanceof VaultCoreError && error.code === "VAULT_WRITE_DENIED",
  );

  const reloadedAgentIdentities = new InMemoryAgentIdentityRegistry();
  const reloadedDeps = createPersistentVaultCoreDependencies(storage, {
    vaultId: authority.vaultId.value,
    vaultWorkingKey,
    proofVerifier: { maxSkewMs: 60_000 },
  });
  const reloadedAuthority = createVaultCore({
    ...reloadedDeps,
    executor: new HttpDispatchExecutor(async () => new Response("ok", { status: 200 })),
    agentIdentities: reloadedAgentIdentities,
    agentProofVerifier: new SignatureAgentProofVerifier(reloadedAgentIdentities, reloadedDeps.sessionTokens, { maxSkewMs: 60_000 }),
  });
  const reloadedVault = wrapVaultCoreAsVaultService(reloadedAuthority);
  const reloadedClient = createVaultClient({
    vault: reloadedVault,
    passwordVerifier: async (password) => password === "policy-password",
  });
  const reloadedCapabilityId = "cap-reloaded";
  const reloadedImportedAgent = await reloadedClient.ownerImportAgent({
    privateKey: agentIdentity.privateKey,
  });
  const reloadedVaultAgentId = reloadedImportedAgent.agent.agentId;
  await reloadedClient.ownerGrantCapability({
    capability: {
      vaultId: reloadedAuthority.vaultId,
      capabilityId: reloadedCapabilityId,
      agentId: reloadedVaultAgentId,
      operation: "dispatch_http",
      write: {
        secretIds: [restrictedRecord.secretId.value],
        scope: "https://allowed.example.com/resource",
        methods: ["POST"],
      },
      read: { paths: ["$"] },
      issuedAt: new Date().toISOString(),
      auditRequired: true,
    },
  });

  const verifierSigner = new LocalSigner(agentIdentity);
  const requestedAt = new Date().toISOString();
  const requestId = "manual-check";
  const binding = JSON.stringify({
    requestId,
    requestedAt,
    agentId: reloadedVaultAgentId,
    capabilityId: reloadedCapabilityId,
    secretId: restrictedRecord.secretId.value,
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    body: null,
  });

  const authorization = await reloadedAuthority.agentAuthorizeDispatch({
    vaultId: reloadedAuthority.vaultId,
    requestId,
    requestedAt,
    agent: { kind: "agent", id: reloadedVaultAgentId },
    capability: {
      vaultId: reloadedAuthority.vaultId,
      capabilityId: reloadedCapabilityId,
      agentId: reloadedVaultAgentId,
      operation: "dispatch_http",
      write: {
        secretIds: [restrictedRecord.secretId.value],
        scope: "https://allowed.example.com/resource",
        methods: ["POST"],
      },
      read: { paths: ["$"] },
      issuedAt: new Date().toISOString(),
      auditRequired: true,
    },
    proof: {
      agentId: reloadedVaultAgentId,
      signature: await verifierSigner.sign(binding),
      requestId,
      requestedAt,
    },
    secretId: restrictedRecord.secretId.value,
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    reason: "Need to verify persisted authorization still works after reload.",
  }).catch((error) => {
    if (error instanceof VaultCoreError) {
      throw error;
    }
    throw error;
  });

  assert.equal(authorization.decision, "allow");
  const persistedSecrets = await readFile(join(tempDir, "secrets.sealed"), "utf8");
  assert.ok(!persistedSecrets.includes("secret-2"));

  const persistedReplayRequestedAt = new Date().toISOString();
  const persistedReplayRequestId = "persisted-replay";
  const persistedReplayBinding = JSON.stringify({
    requestId: persistedReplayRequestId,
    requestedAt: persistedReplayRequestedAt,
    agentId: reloadedVaultAgentId,
    capabilityId: "cap-reloaded",
    secretId: restrictedRecord.secretId.value,
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    body: null,
  });
  const persistedReplayRequest = {
    vaultId: reloadedAuthority.vaultId,
    requestId: persistedReplayRequestId,
    requestedAt: persistedReplayRequestedAt,
    agent: { kind: "agent", id: reloadedVaultAgentId },
    capability: {
      vaultId: reloadedAuthority.vaultId,
      capabilityId: "cap-reloaded",
      agentId: reloadedVaultAgentId,
      operation: "dispatch_http",
      write: {
        secretIds: [restrictedRecord.secretId.value],
        scope: "https://allowed.example.com/resource",
        methods: ["POST"],
      },
      read: { paths: ["$"] },
      issuedAt: new Date().toISOString(),
      auditRequired: true,
    },
    proof: {
      agentId: reloadedVaultAgentId,
      signature: await verifierSigner.sign(persistedReplayBinding),
      requestId: persistedReplayRequestId,
      requestedAt: persistedReplayRequestedAt,
    },
    secretId: restrictedRecord.secretId.value,
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    reason: "Need to verify persisted replay protection across restarts.",
  };
  const persistedReplayFirst = await reloadedAuthority.agentDispatchSecret(persistedReplayRequest);
  assert.equal(persistedReplayFirst.status, "SUCCEEDED");

  const restartedAgentIdentities = new InMemoryAgentIdentityRegistry();
  const restartedDeps = createPersistentVaultCoreDependencies(storage, {
    vaultId: authority.vaultId.value,
    vaultWorkingKey,
    proofVerifier: { maxSkewMs: 60_000 },
  });
  const restartedAuthority = createVaultCore({
    ...restartedDeps,
    executor: new HttpDispatchExecutor(async () => new Response("ok", { status: 200 })),
    agentIdentities: restartedAgentIdentities,
    agentProofVerifier: new SignatureAgentProofVerifier(restartedAgentIdentities, restartedDeps.sessionTokens, { maxSkewMs: 60_000 }),
  });
  const restartedVault = wrapVaultCoreAsVaultService(restartedAuthority);
  const restartedClient = createVaultClient({
    vault: restartedVault,
    passwordVerifier: async (password) => password === "policy-password",
  });
  const restartedRateLimitCapabilityId = "cap-limited";
  const restartedImportedAgent = await restartedClient.ownerImportAgent({
    privateKey: agentIdentity.privateKey,
  });
  const restartedVaultAgentId = restartedImportedAgent.agent.agentId;
  await restartedClient.ownerGrantCapability({
    capability: {
      vaultId: restartedAuthority.vaultId,
      capabilityId: restartedRateLimitCapabilityId,
      agentId: restartedVaultAgentId,
      operation: "dispatch_http",
      write: {
        secretIds: [restrictedRecord.secretId.value],
        scope: "https://allowed.example.com/resource",
        methods: ["POST"],
      },
      read: { paths: ["$"] },
      issuedAt: new Date().toISOString(),
      rateLimit: {
        maxRequests: 1,
        windowMs: 60_000,
      },
      auditRequired: true,
    },
  });
  await assert.rejects(
    () => restartedAuthority.agentDispatchSecret(persistedReplayRequest),
    (error) => error instanceof VaultCoreError && error.code === "VAULT_DISPATCH_DENIED" && /replay/.test(error.message),
  );

  const restartedRateLimitSigner = new LocalSigner(agentIdentity);
  const restartedRateLimitRequestedAt = new Date().toISOString();
  const restartedRateLimitRequestId = "restarted-rate-limit";
  const restartedRateLimitBinding = JSON.stringify({
    requestId: restartedRateLimitRequestId,
    requestedAt: restartedRateLimitRequestedAt,
    agentId: restartedVaultAgentId,
    capabilityId: restartedRateLimitCapabilityId,
    secretId: restrictedRecord.secretId.value,
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    body: null,
  });
  const restartedRateLimitSignature = await restartedRateLimitSigner.sign(restartedRateLimitBinding);
  const restartedRateLimitResult = await restartedAuthority.agentDispatchSecret({
    vaultId: restartedAuthority.vaultId,
    requestId: restartedRateLimitRequestId,
    requestedAt: restartedRateLimitRequestedAt,
    agent: { kind: "agent", id: restartedVaultAgentId },
    capability: {
      vaultId: restartedAuthority.vaultId,
      capabilityId: restartedRateLimitCapabilityId,
      agentId: restartedVaultAgentId,
      operation: "dispatch_http",
      write: {
        secretIds: [restrictedRecord.secretId.value],
        scope: "https://allowed.example.com/resource",
        methods: ["POST"],
      },
      read: { paths: ["$"] },
      issuedAt: new Date().toISOString(),
      rateLimit: {
        maxRequests: 1,
        windowMs: 60_000,
      },
      auditRequired: true,
    },
    proof: {
      agentId: restartedVaultAgentId,
      signature: restartedRateLimitSignature,
      requestId: restartedRateLimitRequestId,
      requestedAt: restartedRateLimitRequestedAt,
    },
    secretId: restrictedRecord.secretId.value,
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    reason: "Need to verify restarted rate limiting still works.",
  });
  assert.equal(restartedRateLimitResult.status, "SUCCEEDED");

  const reloadedAudit = await client.ownerReadAudit({ secretAlias: "restricted-token" });
  assert.ok(reloadedAudit.some((entry) => entry.action === "REASSIGN_ALIAS" && entry.outcome === "DENIED"));
  assert.ok(reloadedAudit.some((entry) => entry.action === "EXPORT_SECRET" && entry.outcome === "SUCCEEDED"));
  assert.ok(reloadedAudit.some((entry) => entry.outcome === "DENIED" && /capability revoked/.test(entry.detail)));
  assert.ok(reloadedAudit.some((entry) => entry.outcome === "DENIED" && /path denied|capability rate limit exceeded/.test(entry.detail)));
  const storedThenDefinedAudit = await client.ownerReadAudit({ secretAlias: "stored-then-defined-token" });
  assert.ok(storedThenDefinedAudit.some((entry) => entry.action === "WRITE_SECRET" && entry.outcome === "SUCCEEDED"));

  console.log("policy and persistence smoke test passed");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
