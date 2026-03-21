import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createVaultCore,
  createPersistentVaultCoreDependencies,
  initializePersistentVault,
  recoverPersistentVault,
  recoverVaultWorkingKey,
  wrapVaultCoreAsVaultService,
  createStandardAcquireBoundary,
  createStandardDispatchBoundary,
  createOwnerClient,
  createAgentClient,
  DefaultPolicyEngine,
  FsStorageProvider,
  HttpDispatchExecutor,
  InMemoryAgentIdentityRegistry,
  InMemoryAuditLog,
  InMemoryCapabilityRegistry,
  InMemoryCustomHttpFlowRegistry,
  InMemoryReplayGuard,
  InMemoryOwnerIdentityRegistry,
  InMemorySecretCustody,
  InMemorySecretRepository,
  LocalVaultTransport,
  LocalSigner,
  PersistentVaultAuditLog,
  PersistentVaultSecretCustody,
  PersistentVaultSecretRepository,
  RandomIdGenerator,
  SignatureAgentProofVerifier,
  SignatureOwnerProofVerifier,
  SystemClock,
  VaultCoreError,
  IdentityError,
  IdentityErrorCode,
  generateIdentityKeys,
} from "../../dist/runtime/index.js";

assert.equal(typeof createVaultCore, "function");
assert.equal(typeof createStandardAcquireBoundary, "function");
assert.equal(typeof createStandardDispatchBoundary, "function");
assert.equal(typeof createOwnerClient, "function");
assert.equal(typeof createAgentClient, "function");
assert.equal(typeof InMemorySecretRepository, "function");
assert.equal(typeof HttpDispatchExecutor, "function");
assert.equal(typeof VaultCoreError, "function");
assert.equal(typeof IdentityError, "function");
assert.equal(typeof IdentityErrorCode, "object");

const agentKeyPair = generateIdentityKeys();
const ownerKeyPair = generateIdentityKeys();
assert.equal(typeof agentKeyPair.privateKey, "string");
assert.equal(typeof agentKeyPair.publicKey, "string");

let seenAuthHeader = null;
const runtimeSurfaceFetch = async (url, init) => {
  seenAuthHeader = new Headers(init?.headers).get("Authorization");
  if (url.toString().includes("/custom-acquire")) {
    return new Response(JSON.stringify({ custom_token: "acquired-secret", scope: "read" }), { status: 200 });
  }
  if (url.toString().includes("/custom-status")) {
    return new Response(JSON.stringify({ state: "ok", nested: { code: 200 } }), { status: 200 });
  }
  return new Response("ok", { status: 200 });
};
const runtimeSurfaceAgentIdentities = new InMemoryAgentIdentityRegistry();
const runtimeSurfaceOwnerIdentities = new InMemoryOwnerIdentityRegistry();
const runtimeSurfaceCustomFlows = new InMemoryCustomHttpFlowRegistry();
const authority = createVaultCore({
  vaultId: { value: "vault-runtime-surface" },
  secrets: new InMemorySecretRepository(),
  custody: new InMemorySecretCustody(),
  policy: new DefaultPolicyEngine(),
  audit: new InMemoryAuditLog(),
  executor: new HttpDispatchExecutor(runtimeSurfaceFetch),
  agentIdentities: runtimeSurfaceAgentIdentities,
  ownerIdentities: runtimeSurfaceOwnerIdentities,
  capabilities: new InMemoryCapabilityRegistry(),
  proofVerifier: new SignatureAgentProofVerifier(runtimeSurfaceAgentIdentities),
  ownerProofVerifier: new SignatureOwnerProofVerifier(runtimeSurfaceOwnerIdentities),
  customFlows: runtimeSurfaceCustomFlows,
  replayGuard: new InMemoryReplayGuard(),
  clock: new SystemClock(),
  ids: new RandomIdGenerator(),
});
const vault = wrapVaultCoreAsVaultService(authority, {
  customFlows: runtimeSurfaceCustomFlows,
  fetchImpl: runtimeSurfaceFetch,
});
await authority.bootstrapOwnerIdentity({
  vaultId: authority.vaultId,
  ownerId: "owner-1",
  publicKey: ownerKeyPair.publicKey,
});

const owner = createOwnerClient({ ownerId: "owner-1" }, vault, new LocalSigner(ownerKeyPair), new SystemClock());
await owner.registerAgentIdentity({
  agentId: "agent-1",
  publicKey: agentKeyPair.publicKey,
});
const ownedRecord = await owner.writeSecret({
  alias: "api-token",
  plaintext: "super-secret",
  targetBindings: [
    {
      kind: "site",
      targetId: "api.example.com",
      targetUrl: "https://api.example.com/endpoint",
      methods: ["POST"],
    },
    {
      kind: "site",
      targetId: "api.example.com",
      targetUrl: "https://api.example.com/custom-status",
      methods: ["POST"],
    },
  ],
});

const exportedSecret = await owner.exportSecret({ alias: "api-token" });
assert.equal(exportedSecret.plaintext, "super-secret");
assert.equal(exportedSecret.alias.value, "api-token");

const dispatchCapability = {
  vaultId: authority.vaultId,
  capabilityId: "cap-1",
  agentId: "agent-1",
  secretIds: [ownedRecord.secretId.value],
  operation: "dispatch_http",
  allowedTargets: ["https://API.EXAMPLE.com:443/endpoint?ignored=yes#fragment"],
  allowedMethods: ["POST"],
  issuedAt: new Date().toISOString(),
  auditRequired: true,
};
await owner.registerCapability({ capability: dispatchCapability });

const agent = createAgentClient(
  { agentId: "agent-1" },
  {
    ...dispatchCapability,
  },
  new LocalSigner(agentKeyPair),
  new LocalVaultTransport(vault, "cap-1"),
  new SystemClock(),
);

const result = await agent.dispatch({
  secretAlias: "api-token",
  targetUrl: "https://api.example.com/endpoint",
  method: "POST",
  body: '{"hello":"world"}',
});

assert.equal(result.status, "succeeded");
assert.equal(seenAuthHeader, "Bearer super-secret");
assert.equal(result.responseBody, "ok");

await owner.registerCustomFlow({
  flowId: "flow-shape-only",
  mode: "send_secret",
  targetUrl: "https://api.example.com/custom-status",
  method: "POST",
  responseVisibility: "shape_only",
});

const customCapability = {
  vaultId: authority.vaultId,
  capabilityId: "cap-custom",
  agentId: "agent-1",
  customFlowId: "flow-shape-only",
  secretIds: [ownedRecord.secretId.value],
  operation: "custom_http",
  allowedTargets: ["https://api.example.com/custom-status"],
  allowedMethods: ["POST"],
  issuedAt: new Date().toISOString(),
  auditRequired: true,
};
await owner.registerCapability({ capability: customCapability });

const customAgent = createAgentClient(
  { agentId: "agent-1" },
  {
    ...customCapability,
  },
  new LocalSigner(agentKeyPair),
  new LocalVaultTransport(vault, "cap-custom"),
  new SystemClock(),
);

const customResult = await customAgent.dispatch({
  secretAlias: "api-token",
  targetUrl: "https://api.example.com/custom-status",
  method: "POST",
  body: '{"mode":"custom"}',
});

assert.equal(customResult.status, "succeeded");
assert.equal(customResult.responseBody, JSON.stringify({ state: null, nested: { code: null } }));

await owner.registerCustomFlow({
  flowId: "flow-custom-acquire",
  mode: "acquire_secret",
  targetUrl: "https://api.example.com/custom-acquire",
  method: "POST",
  responseVisibility: "shape_only",
  responseSecret: {
    kind: "json_field",
    field: "custom_token",
    storeAlias: "custom-acquired-token",
  },
});

const customAcquireCapability = {
  vaultId: authority.vaultId,
  capabilityId: "cap-custom-acquire",
  agentId: "agent-1",
  customFlowId: "flow-custom-acquire",
  operation: "custom_http",
  allowedTargets: ["https://api.example.com/custom-acquire"],
  allowedMethods: ["POST"],
  issuedAt: new Date().toISOString(),
  auditRequired: true,
};
await owner.registerCapability({ capability: customAcquireCapability });

const customAcquireAgent = createAgentClient(
  { agentId: "agent-1" },
  {
    ...customAcquireCapability,
  },
  new LocalSigner(agentKeyPair),
  new LocalVaultTransport(vault, "cap-custom-acquire"),
  new SystemClock(),
);

const customAcquireResult = await customAcquireAgent.dispatch({
  targetUrl: "https://api.example.com/custom-acquire",
  method: "POST",
});

assert.equal(customAcquireResult.status, "succeeded");
assert.equal(customAcquireResult.responseBody, JSON.stringify({ custom_token: null, scope: null }));

const tempDir = await mkdtemp(join(tmpdir(), "cbio-authority-"));
try {
  const storage = new FsStorageProvider(tempDir);
  const initializedPersistentVault = await initializePersistentVault(storage, {
    vaultId: "vault-runtime-persistent",
    policy: {
      trustedIssuerIds: ["issuer-1"],
    },
    bootstrapOwner: {
      vaultId: { value: "vault-runtime-persistent" },
      ownerId: "owner-1",
      publicKey: ownerKeyPair.publicKey,
    },
    vault: {
      fetchImpl: async () => new Response(JSON.stringify({
        access_token: "issuer-secret",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "read write",
      }), { status: 200 }),
    },
  });
  const vaultWorkingKey = initializedPersistentVault.initializedCustody.vaultWorkingKey;
  const recoveredVaultWorkingKey = await recoverVaultWorkingKey(storage, initializedPersistentVault.initializedCustody.vaultRecoveryKey);
  assert.equal(recoveredVaultWorkingKey, vaultWorkingKey);
  const persistentAgentIdentities = new InMemoryAgentIdentityRegistry();
  const persistentOwnerIdentities = new InMemoryOwnerIdentityRegistry();
  const persistentAuthority = createVaultCore({
    ...createPersistentVaultCoreDependencies(storage, {
      vaultId: "vault-runtime-persistent",
      vaultWorkingKey,
      policy: {
        trustedIssuerIds: ["issuer-1"],
      },
    }),
    executor: new HttpDispatchExecutor(async () => new Response("ok", { status: 200 })),
    agentIdentities: persistentAgentIdentities,
    ownerIdentities: persistentOwnerIdentities,
    proofVerifier: new SignatureAgentProofVerifier(persistentAgentIdentities),
    ownerProofVerifier: new SignatureOwnerProofVerifier(persistentOwnerIdentities),
  });
  await persistentAuthority.bootstrapOwnerIdentity({
    vaultId: persistentAuthority.vaultId,
    ownerId: "owner-1",
    publicKey: ownerKeyPair.publicKey,
  });
  const persistentVault = wrapVaultCoreAsVaultService(persistentAuthority, {
    fetchImpl: async () => new Response(JSON.stringify({
      access_token: "issuer-secret",
      token_type: "Bearer",
      expires_in: 3600,
      scope: "read write",
    }), { status: 200 }),
  });
  const issuerResult = await persistentVault.acquireSecret({
    alias: "issuer-token",
    issuerId: "issuer-1",
    url: "https://issuer.example.com/token",
    flow: "oauth_token_response.access_token",
  });
  assert.equal(issuerResult.status, "stored");
  assert.deepEqual(issuerResult.responseShape, {
    token_type: "Bearer",
    expires_in: 3600,
    scope: "read write",
  });
  const ownerForAudit = createOwnerClient({ ownerId: "owner-1" }, persistentVault, new LocalSigner(ownerKeyPair), new SystemClock());
  const audit = await ownerForAudit.getAudit({ secretAlias: "issuer-token" });
  assert.ok(audit.length >= 1);
  const persistentExport = await ownerForAudit.exportSecret({ alias: "issuer-token" });
  assert.equal(persistentExport.plaintext, "issuer-secret");
  const recoveredPersistentVault = await recoverPersistentVault(storage, {
    vaultId: "vault-runtime-persistent",
    vaultRecoveryKey: initializedPersistentVault.initializedCustody.vaultRecoveryKey,
  });
  assert.equal(recoveredPersistentVault.vaultWorkingKey, vaultWorkingKey);
  const acquiredAgentKeyPair = generateIdentityKeys();
  await ownerForAudit.registerAgentIdentity({ agentId: "agent-acquired", publicKey: acquiredAgentKeyPair.publicKey });
  const acquiredCapability = {
    vaultId: persistentAuthority.vaultId,
    capabilityId: "cap-acquired",
    agentId: "agent-acquired",
    secretAliases: ["issuer-token"],
    operation: "dispatch_http",
    allowedTargets: ["https://issuer.example.com/other"],
    allowedMethods: ["GET"],
    issuedAt: new Date().toISOString(),
    auditRequired: true,
  };
  await ownerForAudit.registerCapability({ capability: acquiredCapability });
  const acquiredVault = wrapVaultCoreAsVaultService(persistentAuthority);
  const acquiredAgent = createAgentClient(
    { agentId: "agent-acquired" },
    {
      ...acquiredCapability,
    },
    new LocalSigner(acquiredAgentKeyPair),
    new LocalVaultTransport(acquiredVault, "cap-acquired"),
    new SystemClock(),
  );
  await assert.rejects(
    () => acquiredAgent.dispatch({
      secretAlias: "issuer-token",
      targetUrl: "https://issuer.example.com/other",
      method: "GET",
    }),
    /VAULT_AGENT_DISPATCH_REJECTED|VAULT_DISPATCH_DENIED/,
  );
  const secretsFile = await readFile(join(tempDir, "vault/secrets.json"), "utf8");
  assert.ok(!secretsFile.includes("issuer-secret"));
  const custodyDirEntries = await readdir(join(tempDir, "vault/custody"));
  assert.ok(custodyDirEntries.length >= 1);

  const failingAuditStorage = new FsStorageProvider(tempDir);
  const rollbackAgentIdentities = new InMemoryAgentIdentityRegistry();
  const rollbackOwnerIdentities = new InMemoryOwnerIdentityRegistry();
  const bootstrapRollbackAuthority = createVaultCore({
    vaultId: { value: "vault-rollback" },
    secrets: new PersistentVaultSecretRepository(failingAuditStorage),
    custody: new PersistentVaultSecretCustody(failingAuditStorage, vaultWorkingKey),
    policy: new DefaultPolicyEngine(),
    audit: new InMemoryAuditLog(),
    executor: new HttpDispatchExecutor(async () => new Response("ok", { status: 200 })),
    agentIdentities: rollbackAgentIdentities,
    ownerIdentities: rollbackOwnerIdentities,
    proofVerifier: new SignatureAgentProofVerifier(rollbackAgentIdentities),
    ownerProofVerifier: new SignatureOwnerProofVerifier(rollbackOwnerIdentities),
    customFlows: new InMemoryCustomHttpFlowRegistry(),
    replayGuard: new InMemoryReplayGuard(),
    clock: new SystemClock(),
    ids: new RandomIdGenerator(),
  });
  await bootstrapRollbackAuthority.bootstrapOwnerIdentity({
    vaultId: bootstrapRollbackAuthority.vaultId,
    ownerId: "owner-rollback",
    publicKey: ownerKeyPair.publicKey,
  });
  const rollbackAuthority = createVaultCore({
    vaultId: { value: "vault-rollback" },
    secrets: new PersistentVaultSecretRepository(failingAuditStorage),
    custody: new PersistentVaultSecretCustody(failingAuditStorage, vaultWorkingKey),
    policy: new DefaultPolicyEngine(),
    audit: {
      async append() {
        throw new Error("audit sink offline");
      },
      async query() {
        return [];
      },
    },
    executor: new HttpDispatchExecutor(async () => new Response("ok", { status: 200 })),
    agentIdentities: rollbackAgentIdentities,
    ownerIdentities: rollbackOwnerIdentities,
    proofVerifier: new SignatureAgentProofVerifier(rollbackAgentIdentities),
    ownerProofVerifier: new SignatureOwnerProofVerifier(rollbackOwnerIdentities),
    customFlows: new InMemoryCustomHttpFlowRegistry(),
    replayGuard: new InMemoryReplayGuard(),
    clock: new SystemClock(),
    ids: new RandomIdGenerator(),
  });
  const rollbackVault = wrapVaultCoreAsVaultService(rollbackAuthority);
  const rollbackOwner = createOwnerClient({ ownerId: "owner-rollback" }, rollbackVault, new LocalSigner(ownerKeyPair), new SystemClock());
  const custodyDir = join(tempDir, "vault/custody");
  const custodyCountBefore = await readdir(custodyDir).then((entries) => entries.length).catch(() => 0);
  await assert.rejects(
    () => rollbackOwner.writeSecret({
      alias: "should-rollback",
      plaintext: "rollback-secret",
      targetBindings: [
        {
          kind: "site",
          targetId: "rollback-site",
          targetUrl: "https://rollback.example.com/endpoint",
          methods: ["POST"],
        },
      ],
    }),
    (error) => error instanceof VaultCoreError && error.code === "VAULT_AUDIT_FAILED",
  );
  const rollbackSecretsFile = await readFile(join(tempDir, "vault/secrets.json"), "utf8").catch(() => "");
  assert.ok(!rollbackSecretsFile.includes("should-rollback"));
  const custodyCountAfter = await readdir(custodyDir).then((entries) => entries.length).catch(() => 0);
  assert.equal(custodyCountAfter, custodyCountBefore);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("runtime surface smoke test passed");
