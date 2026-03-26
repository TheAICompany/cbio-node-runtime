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
    agentProofVerifier: new SignatureAgentProofVerifier(policyAgentIdentities, { maxSkewMs: 60_000 }),
  });
  const vault = wrapVaultCoreAsVaultService(authority);

  const client = createVaultClient({
    vault,
    passwordVerifier: async (password) => password === "policy-password",
  });
  const unscopedRecord = await client.ownerStoreSecret({
    alias: "unscoped-token",
    plaintext: "secret-0",
  });
  assert.equal(unscopedRecord.targetBindings.length, 0);

  const unscopedArrayRecord = await client.ownerStoreSecret({
    alias: "unscoped-array-token",
    plaintext: "secret-0b",
  });
  assert.equal(unscopedArrayRecord.targetBindings.length, 0);

  const storedThenDefinedRecord = await client.ownerStoreSecret({
    alias: "stored-then-defined-token",
    plaintext: "secret-1",
  });
  assert.equal(storedThenDefinedRecord.targetBindings.length, 0);

  const definedRecord = await client.ownerDefineSecretTargets({
    alias: "stored-then-defined-token",
    targetBindings: [
      {
        kind: "site",
        targetId: "allowed-site",
        targetUrl: "https://allowed.example.com/resource",
        methods: ["POST"],
      },
    ],
  });
  assert.equal(definedRecord.targetBindings.length, 1);

  await assert.rejects(
    () => client.ownerWriteSecret({
      alias: "malformed-token",
      plaintext: "secret-bad",
      targetBindings: [
        {
          kind: "site",
          targetId: "bad-site",
          targetUrl: "https://bad.example.com/endpoint",
          methods: [],
        },
      ],
    }),
    (error) => error instanceof VaultCoreError && error.code === "VAULT_WRITE_DENIED",
  );

  const restrictedRecord = await client.ownerWriteSecret({
    alias: "restricted-token",
    plaintext: "secret-2",
    targetBindings: [
      {
        kind: "site",
        targetId: "allowed-site",
        targetUrl: "https://allowed.example.com/resource",
        methods: ["POST"],
      },
    ],
  });

  const agentIdentity = createIdentity();
  const importedAgent = await client.ownerImportAgent({
    privateKey: agentIdentity.privateKey,
  });
  const vaultAgentId = importedAgent.agent.agentId;
  const restrictedCapability = {
    vaultId: authority.vaultId,
    capabilityId: "cap-restricted",
    agentId: vaultAgentId,
    secretIds: [restrictedRecord.secretId.value],
    operation: "dispatch_http",
    scope: "https://allowed.example.com/resource",
    methods: ["POST"],
    issuedAt: new Date().toISOString(),
    auditRequired: true,
  };
  await client.ownerGrantCapability({ capability: restrictedCapability });
  const storedThenDefinedCapability = {
    vaultId: authority.vaultId,
    capabilityId: "cap-stored-then-defined",
    agentId: vaultAgentId,
    secretIds: [storedThenDefinedRecord.secretId.value],
    operation: "dispatch_http",
    scope: "https://allowed.example.com/resource",
    methods: ["POST"],
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

  await assert.rejects(
    () => agent.agentDispatch({
      secretAlias: "unscoped-token",
      targetUrl: "https://allowed.example.com/resource",
      method: "POST",
    }),
    /VAULT_DISPATCH_DENIED|BROKER_GATEWAY_REJECTED/,
  );
  const storedThenDefinedResult = await storedThenDefinedAgent.agentDispatch({
    secretAlias: "stored-then-defined-token",
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
  });
  assert.equal(storedThenDefinedResult.status, "SUCCEEDED");

  const clearedRecord = await client.ownerDefineSecretTargets({
    alias: "stored-then-defined-token",
    targetBindings: [],
  });
  assert.equal(clearedRecord.targetBindings.length, 0);
  await assert.rejects(
    () => storedThenDefinedAgent.agentDispatch({
      secretAlias: "stored-then-defined-token",
      targetUrl: "https://allowed.example.com/resource",
      method: "POST",
    }),
    /VAULT_DISPATCH_DENIED|BROKER_GATEWAY_REJECTED/,
  );

  await assert.rejects(
    () => agent.agentDispatch({
      secretAlias: "restricted-token",
      targetUrl: "https://denied.example.com/resource",
      method: "POST",
    }),
    /VAULT_DISPATCH_DENIED|BROKER_GATEWAY_REJECTED/,
  );

  const audit = await client.ownerReadAudit({ secretAlias: "restricted-token" });
  assert.ok(audit.length >= 1);
  assert.ok(audit.some((entry) => entry.outcome === "DENIED" && /target denied|record target denied/.test(entry.detail)));
  const exportedRestrictedSecret = await client.ownerExportSecret({ alias: "restricted-token", password: "policy-password" });
  assert.equal(exportedRestrictedSecret.plaintext, "secret-2");

  await assert.rejects(
    () => agent.agentDispatch({
      secretAlias: "restricted-token",
      targetUrl: "https://allowed.example.com/other",
      method: "POST",
    }),
    /VAULT_DISPATCH_DENIED|BROKER_GATEWAY_REJECTED/,
  );

  const rateLimitedCapability = {
    vaultId: authority.vaultId,
    capabilityId: "cap-limited",
    agentId: "agent-restricted",
    secretIds: [restrictedRecord.secretId.value],
    operation: "dispatch_http",
    scope: "https://allowed.example.com/resource",
    methods: ["POST"],
    issuedAt: new Date().toISOString(),
    rateLimit: {
      maxRequests: 1,
      windowMs: 60_000,
    },
    auditRequired: true,
  };
  await client.ownerGrantCapability({ capability: rateLimitedCapability });
  const rateLimitedAgent = createAgentClient({
    agentIdentity: { agentId: "agent-restricted" },
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
  });
  assert.equal(firstLimited.status, "SUCCEEDED");
  await assert.rejects(
    () => rateLimitedAgent.agentDispatch({
      secretAlias: "restricted-token",
      targetUrl: "https://allowed.example.com/resource",
      method: "POST",
    }),
    /VAULT_DISPATCH_DENIED|BROKER_GATEWAY_REJECTED/,
  );

  const revokedVersion = await revocations.revoke(authority.vaultId, "agent-restricted", "cap-restricted");
  assert.equal(revokedVersion, 1);
  await assert.rejects(
    () => agent.agentDispatch({
      secretAlias: "restricted-token",
      targetUrl: "https://allowed.example.com/resource",
      method: "POST",
    }),
    /VAULT_DISPATCH_DENIED|BROKER_GATEWAY_REJECTED/,
  );

  await assert.rejects(
    () => client.ownerWriteSecret({
      alias: "restricted-token",
      plaintext: "replacement-secret",
      targetBindings: [
        {
          kind: "site",
          targetId: "allowed-site",
          targetUrl: "https://allowed.example.com/resource",
          methods: ["POST"],
        },
      ],
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
    agentProofVerifier: new SignatureAgentProofVerifier(reloadedAgentIdentities, { maxSkewMs: 60_000 }),
  });
  const reloadedVault = wrapVaultCoreAsVaultService(reloadedAuthority);
  const reloadedClient = createVaultClient({
    vault: reloadedVault,
    passwordVerifier: async (password) => password === "policy-password",
  });
  await reloadedClient.ownerImportAgent({
    agentId: "agent-restricted",
    privateKey: agentIdentity.privateKey,
  });

  const verifierSigner = new LocalSigner(agentIdentity);
  const requestedAt = new Date().toISOString();
  const requestId = "manual-check";
  const reloadedCapabilityId = "cap-reloaded";
  const binding = JSON.stringify({
    requestId,
    requestedAt,
    agentId: "agent-restricted",
    capabilityId: reloadedCapabilityId,
    secretAlias: "restricted-token",
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    body: null,
  });

  const authorization = await reloadedAuthority.agentAuthorizeDispatch({
    vaultId: reloadedAuthority.vaultId,
    requestId,
    requestedAt,
    agent: { kind: "agent", id: "agent-restricted" },
    capability: {
      vaultId: reloadedAuthority.vaultId,
      capabilityId: reloadedCapabilityId,
      agentId: "agent-restricted",
      secretIds: [restrictedRecord.secretId.value],
      operation: "dispatch_http",
      scope: "https://allowed.example.com/resource",
      methods: ["POST"],
      issuedAt: new Date().toISOString(),
      auditRequired: true,
    },
    proof: {
      agentId: "agent-restricted",
      signature: await verifierSigner.sign(binding),
      requestId,
      requestedAt,
    },
    secretAlias: "restricted-token",
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
  }).catch((error) => {
    if (error instanceof VaultCoreError) {
      throw error;
    }
    throw error;
  });

  assert.equal(authorization.decision, "allow");
  const persistedSecrets = await readFile(join(tempDir, "vault/secrets.json"), "utf8");
  assert.ok(!persistedSecrets.includes("secret-2"));

  const persistedReplayRequestedAt = new Date().toISOString();
  const persistedReplayRequestId = "persisted-replay";
  const persistedReplayBinding = JSON.stringify({
    requestId: persistedReplayRequestId,
    requestedAt: persistedReplayRequestedAt,
    agentId: "agent-restricted",
    capabilityId: "cap-reloaded",
    secretAlias: "restricted-token",
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    body: null,
  });
  const persistedReplayRequest = {
    vaultId: reloadedAuthority.vaultId,
    requestId: persistedReplayRequestId,
    requestedAt: persistedReplayRequestedAt,
    agent: { kind: "agent", id: "agent-restricted" },
    capability: {
      vaultId: reloadedAuthority.vaultId,
      capabilityId: "cap-reloaded",
      agentId: "agent-restricted",
      secretIds: [restrictedRecord.secretId.value],
      operation: "dispatch_http",
      scope: "https://allowed.example.com/resource",
      methods: ["POST"],
      issuedAt: new Date().toISOString(),
      auditRequired: true,
    },
    proof: {
      agentId: "agent-restricted",
      signature: await verifierSigner.sign(persistedReplayBinding),
      requestId: persistedReplayRequestId,
      requestedAt: persistedReplayRequestedAt,
    },
    secretAlias: "restricted-token",
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
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
    agentProofVerifier: new SignatureAgentProofVerifier(restartedAgentIdentities, { maxSkewMs: 60_000 }),
  });
  const restartedVault = wrapVaultCoreAsVaultService(restartedAuthority);
  const restartedClient = createVaultClient({
    vault: restartedVault,
    passwordVerifier: async (password) => password === "policy-password",
  });
  await restartedClient.ownerImportAgent({
    agentId: "agent-restricted",
    privateKey: agentIdentity.privateKey,
  });
  await assert.rejects(
    () => restartedAuthority.agentDispatchSecret(persistedReplayRequest),
    (error) => error instanceof VaultCoreError && error.code === "VAULT_DISPATCH_DENIED" && /replay/.test(error.message),
  );

  const restartedRateLimitSigner = new LocalSigner(agentIdentity);
  const restartedRateLimitRequestedAt = new Date().toISOString();
  const restartedRateLimitRequestId = "restarted-rate-limit";
  const restartedRateLimitCapabilityId = "cap-limited";
  const restartedRateLimitBinding = JSON.stringify({
    requestId: restartedRateLimitRequestId,
    requestedAt: restartedRateLimitRequestedAt,
    agentId: "agent-restricted",
    capabilityId: restartedRateLimitCapabilityId,
    secretAlias: "restricted-token",
    targetUrl: "https://allowed.example.com/resource",
    method: "POST",
    body: null,
  });
  const restartedRateLimitSignature = await restartedRateLimitSigner.sign(restartedRateLimitBinding);
  await assert.rejects(
    () => restartedAuthority.agentDispatchSecret({
      vaultId: restartedAuthority.vaultId,
      requestId: restartedRateLimitRequestId,
      requestedAt: restartedRateLimitRequestedAt,
      agent: { kind: "agent", id: "agent-restricted" },
      capability: {
        vaultId: restartedAuthority.vaultId,
        capabilityId: restartedRateLimitCapabilityId,
        agentId: "agent-restricted",
        secretIds: [restrictedRecord.secretId.value],
        operation: "dispatch_http",
        scope: "https://allowed.example.com/resource",
        methods: ["POST"],
        issuedAt: new Date().toISOString(),
        rateLimit: {
          maxRequests: 1,
          windowMs: 60_000,
        },
        auditRequired: true,
      },
      proof: {
        agentId: "agent-restricted",
        signature: restartedRateLimitSignature,
        requestId: restartedRateLimitRequestId,
        requestedAt: restartedRateLimitRequestedAt,
      },
      secretAlias: "restricted-token",
      targetUrl: "https://allowed.example.com/resource",
      method: "POST",
    }),
    (error) => error instanceof VaultCoreError && error.code === "VAULT_DISPATCH_DENIED" && /rate limit/.test(error.message),
  );

  const reloadedAudit = await client.ownerReadAudit({ secretAlias: "restricted-token" });
  assert.ok(reloadedAudit.some((entry) => entry.action === "REASSIGN_ALIAS" && entry.outcome === "DENIED"));
  assert.ok(reloadedAudit.some((entry) => entry.action === "EXPORT_SECRET" && entry.outcome === "SUCCEEDED"));
  assert.ok(reloadedAudit.some((entry) => entry.outcome === "DENIED" && /capability revoked/.test(entry.detail)));
  assert.ok(reloadedAudit.some((entry) => entry.outcome === "DENIED" && /path denied|capability rate limit exceeded/.test(entry.detail)));
  const storedThenDefinedAudit = await client.ownerReadAudit({ secretAlias: "stored-then-defined-token" });
  assert.ok(storedThenDefinedAudit.some((entry) => entry.action === "DEFINE_SECRET_TARGETS" && entry.outcome === "SUCCEEDED"));

  console.log("policy and persistence smoke test passed");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
