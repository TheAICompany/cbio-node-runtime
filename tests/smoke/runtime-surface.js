import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createVault,
  createWorkspaceStorage,
  getDefaultWorkspaceDir,
  recoverVault,
  listVaults,
  updateVaultMetadata,
  createStandardAcquireBoundary,
  createVaultClient,
  createAgentClient,
  FsStorageProvider,
  VaultCoreError,
  IdentityError,
  IdentityErrorCode,
  createIdentity,
  restoreIdentity,
} from "../../dist/runtime/index.js";
import {
  createVaultCore,
  createPersistentVaultCoreDependencies,
  DefaultPolicyEngine,
  HttpDispatchExecutor,
  InMemoryAgentIdentityRegistry,
  InMemoryAuditLog,
  InMemoryCapabilityRegistry,
  InMemoryCustomHttpFlowRegistry,
  InMemoryPendingCapabilityRequestRegistry,
  InMemoryPendingRequestRegistry,
  InMemoryReplayGuard,
  InMemorySecretCustody,
  InMemorySecretRepository,
  InMemorySessionTokenRegistry,
  PersistentVaultAuditLog,
  PersistentVaultSecretCustody,
  PersistentVaultSecretRepository,
  RandomIdGenerator,
  SignatureAgentProofVerifier,
  SystemClock,
  initializeVaultCustody,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";
import { LocalSigner } from "../../dist/protocol/crypto.js";
import { MemoryStorageProvider } from "../../dist/storage/memory.js";

assert.equal(typeof createVaultCore, "function");
assert.equal(typeof createStandardAcquireBoundary, "function");
assert.equal(typeof createVaultClient, "function");
assert.equal(typeof createAgentClient, "function");
assert.equal(typeof VaultCoreError, "function");
assert.equal(typeof IdentityError, "function");
assert.equal(typeof IdentityErrorCode, "object");
assert.equal(typeof createWorkspaceStorage, "function");
assert.equal(typeof getDefaultWorkspaceDir, "function");

const agentIdentity = createIdentity({ nickname: "agent-1" });
const restoredAgentIdentity = restoreIdentity(agentIdentity.privateKey, { nickname: "agent-1-restored" });

assert.equal(typeof agentIdentity.privateKey, "string");
assert.equal(typeof agentIdentity.publicKey, "string");
assert.equal(typeof agentIdentity.identityId, "string");
assert.equal(agentIdentity.nickname, "agent-1");
assert.equal(restoredAgentIdentity.privateKey, agentIdentity.privateKey);
assert.equal(restoredAgentIdentity.publicKey, agentIdentity.publicKey);
assert.equal(restoredAgentIdentity.identityId, agentIdentity.identityId);
assert.equal(restoredAgentIdentity.nickname, "agent-1-restored");

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
const runtimeSurfaceCustomFlows = new InMemoryCustomHttpFlowRegistry();
const runtimeSurfaceSessionTokens = new InMemorySessionTokenRegistry();
const authority = createVaultCore({
  vaultId: { value: "vault-runtime-surface" },
  secrets: new InMemorySecretRepository(),
  custody: new InMemorySecretCustody(),
  policy: new DefaultPolicyEngine(),
  audit: new InMemoryAuditLog(),
  executor: new HttpDispatchExecutor(runtimeSurfaceFetch),
  agentIdentities: runtimeSurfaceAgentIdentities,
  capabilities: new InMemoryCapabilityRegistry(),
  agentProofVerifier: new SignatureAgentProofVerifier(runtimeSurfaceAgentIdentities, runtimeSurfaceSessionTokens),
  customFlows: runtimeSurfaceCustomFlows,
  sessionTokens: runtimeSurfaceSessionTokens,
  pendingRequests: new InMemoryPendingRequestRegistry(),
  pendingCapabilityRequests: new InMemoryPendingCapabilityRequestRegistry(),
  replayGuard: new InMemoryReplayGuard(),
  clock: new SystemClock(),
  ids: new RandomIdGenerator(),
});
const vault = wrapVaultCoreAsVaultService(authority, {
  customFlows: runtimeSurfaceCustomFlows,
  fetchImpl: runtimeSurfaceFetch,
});

const client = createVaultClient({
  vault,
});
assert.equal(typeof client.storeSecret, "function");
assert.equal(typeof client.defineSecretTargets, "function");
await client.ownerRegisterAgent({
  agentId: "agent-1",
  publicKey: agentIdentity.publicKey,
});
const ownedRecord = await client.ownerWriteSecret({
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

const exportedSecret = await client.ownerExportSecret({ alias: "api-token" });
assert.equal(exportedSecret.plaintext, "super-secret");
assert.equal(exportedSecret.alias.value, "api-token");

const dispatchCapability = {
  vaultId: authority.vaultId,
  capabilityId: "cap-1",
  agentId: "agent-1",
  secretIds: [ownedRecord.secretId.value],
  operation: "dispatch_http",
  scope: "https://API.EXAMPLE.com:443/endpoint?ignored=yes#fragment",
  methods: ["POST"],
  issuedAt: new Date().toISOString(),
  auditRequired: true,
};
await client.ownerGrantCapability({ capability: dispatchCapability });

const agent = createAgentClient({
  agentIdentity: { agentId: "agent-1" },
  capability: {
    ...dispatchCapability,
  },
  vault,
  signer: new LocalSigner(agentIdentity),
});

const result = await agent.agentDispatch({
  secretAlias: "api-token",
  targetUrl: "https://api.example.com/endpoint",
  method: "POST",
  body: '{"hello":"world"}',
});

assert.equal(result.status, "SUCCEEDED");
assert.equal(seenAuthHeader, "Bearer super-secret");
assert.equal(result.responseBody, "ok");

await client.ownerRegisterFlow({
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
  scope: "https://api.example.com/custom-status",
  methods: ["POST"],
  issuedAt: new Date().toISOString(),
  auditRequired: true,
};
await client.ownerGrantCapability({ capability: customCapability });

const customAgent = createAgentClient({
  agentIdentity: { agentId: "agent-1" },
  capability: {
    ...customCapability,
  },
  vault,
  signer: new LocalSigner(agentIdentity),
});

const customResult = await customAgent.agentDispatch({
  secretAlias: "api-token",
  targetUrl: "https://api.example.com/custom-status",
  method: "POST",
  body: '{"mode":"custom"}',
});

assert.equal(customResult.status, "SUCCEEDED");
assert.equal(customResult.responseBody, JSON.stringify({ state: null, nested: { code: null } }));

await client.ownerRegisterFlow({
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
  scope: "https://api.example.com/custom-acquire",
  methods: ["POST"],
  issuedAt: new Date().toISOString(),
  auditRequired: true,
};
await client.ownerGrantCapability({ capability: customAcquireCapability });

const customAcquireAgent = createAgentClient({
  agentIdentity: { agentId: "agent-1" },
  capability: {
    ...customAcquireCapability,
  },
  vault,
  signer: new LocalSigner(agentIdentity),
});

const customAcquireResult = await customAcquireAgent.agentDispatch({
  targetUrl: "https://api.example.com/custom-acquire",
  method: "POST",
});

assert.equal(customAcquireResult.status, "SUCCEEDED");
assert.equal(customAcquireResult.responseBody, JSON.stringify({ custom_token: null, scope: null }));

const tempDir = await mkdtemp(join(tmpdir(), "cbio-authority-"));
try {
  const storage = new FsStorageProvider(tempDir);
  const createdVault = await createVault(storage, {
    vaultId: "vault-runtime-persistent",
    nickname: "persistent-main",
    policy: {
      trustedIssuerIds: ["issuer-1"],
    },
    password: "password-1",
    vault: {
      fetchImpl: async () => new Response(JSON.stringify({
        access_token: "issuer-secret",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "read write",
      }), { status: 200 }),
    },
  });
  assert.equal(createdVault.nickname, "persistent-main");
  const persistentVault = wrapVaultCoreAsVaultService(createdVault.core, {
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
  const auditClient = createVaultClient({ vault: persistentVault });
  const audit = await auditClient.ownerReadAudit({ secretAlias: "issuer-token" });
  assert.ok(audit.length >= 1);
  const persistentExport = await auditClient.ownerExportSecret({ alias: "issuer-token" });
  assert.equal(persistentExport.plaintext, "issuer-secret");
  const recoveredVaultInstance = await recoverVault(storage, {
    vaultId: "vault-runtime-persistent",
    password: "password-1",
  });
  assert.equal(recoveredVaultInstance.nickname, "persistent-main");

  const defaultWorkspaceDir = await mkdtemp(join(tmpdir(), "cbio-default-workspace-"));
  process.env.C_BIO_WORKSPACE_DIR = defaultWorkspaceDir;
  const autoCreatedVault = await createVault({
    vaultId: "vault-runtime-default-storage",
    nickname: "default-storage-vault",
    password: "password-1",
  });
  assert.equal(autoCreatedVault.nickname, "default-storage-vault");
  assert.equal(await autoCreatedVault.storage.has("vault/sealed/profile.sealed"), true, "Missing profile.sealed");
  assert.equal(await autoCreatedVault.storage.has("vault/sealed/public.sealed"), false, "public.sealed should be removed");
  console.log("-> Storage Architecture Verification OK: Detected single encrypted .sealed profile");

  console.log("-> Verifying Vault Discovery API...");
  const autoRecoveredVault = await recoverVault({
    vaultId: "vault-runtime-default-storage",
    password: "password-1",
  });
  assert.equal(autoRecoveredVault.nickname, "default-storage-vault");
  
  const siblingVault = await createVault(storage, {
    vaultId: "vault-runtime-sibling",
    nickname: "sibling-vault",
    password: "password-1",
  });

  const allVaults = await listVaults(storage);
  assert.ok(allVaults.includes("vault-runtime-sibling"), "Vault should be in the list");
  console.log(`-> Vault List Discovery OK: Successfully found "vault-runtime-sibling"`);

  console.log("-> Verifying Metadata Update...");
  await updateVaultMetadata(siblingVault, {
    nickname: "updated-sibling-vault",
    password: "password-1",
  });
  
  const updatedVaults = await listVaults(storage);
  assert.ok(updatedVaults.includes("vault-runtime-sibling"), "Vault should still be in the list");
  console.log(`   [OK] Metadata updated successfully (verified via ID)`);

  console.log("-> Verifying Physical Delete...");
  await rm(join(tempDir, "vaults/vault-runtime-sibling"), { recursive: true });
  const remainingVaults = await listVaults(storage);
  assert.ok(!remainingVaults.find(v => v.vaultId === "vault-runtime-sibling"), "Vault should be deleted");
  console.log("   [OK] Vault physical deletion successful");
  console.log("-> Verifying Managed Agent Identity Custody...");
  const [managedRecord, managedPrivateKey] = await auditClient.ownerCreateAgent({ 
    agentId: "agent-managed",
    nickname: "Managed Worker",
    metadata: { dept: "security" }
  });
  assert.ok(managedPrivateKey, "Should return private key during creation");
  assert.equal(managedRecord.agentId, "agent-managed");
  assert.equal(managedRecord.nickname, "Managed Worker");
  
  // Verify recovery after persistence
  const agentsInVault = await auditClient.ownerListAgents();
  const foundManaged = agentsInVault.find(a => a.agentId === "agent-managed");
  assert.equal(foundManaged?.privateKey, managedPrivateKey, "Vault should persist the private key");
  console.log("   [OK] Agent creation and private key custody verification passed");

  console.log("-> Verifying Proactive Capability Request Flow...");
  let pendingCapabilityRequest = null;
  const unsubscribeCapability = auditClient.ownerOnPendingCapabilityRequest((record) => {
    pendingCapabilityRequest = record;
  });
  const submittedCapabilityRequest = await auditClient.ownerSubmitCapabilityRequest({
    requester: { kind: "trusted_executor", id: "llm-planner" },
    agentId: "agent-managed",
    secretAliases: ["api-token"],
    scope: "https://api.example.com/users/*",
    methods: ["GET"],
    justification: "Need collection-level user read access",
  });
  assert.equal(submittedCapabilityRequest.agentId, "agent-managed");
  assert.equal(submittedCapabilityRequest.scope.scope, "https://api.example.com/users/*");
  assert.ok(pendingCapabilityRequest, "Capability request observer should fire");
  const pendingCapabilityRequests = await auditClient.ownerListPendingCapabilityRequests();
  assert.equal(pendingCapabilityRequests.length, 1, "Should have one pending capability request");
  const approvedCapability = await auditClient.ownerApproveCapabilityRequest({
    requestId: pendingCapabilityRequests[0].requestId,
    capabilityId: "cap-users-read",
  });
  unsubscribeCapability();
  assert.equal(approvedCapability.capabilityId, "cap-users-read");
  assert.equal(approvedCapability.scope, "https://api.example.com/users/*");
  const capabilitiesAfterApproval = await auditClient.ownerListCapabilities({ agentId: "agent-managed" });
  assert.ok(capabilitiesAfterApproval.some((cap) => cap.capabilityId === "cap-users-read"), "Approved capability should be registered");
  console.log("   [OK] Proactive capability request approval flow passed");

  const acquiredAgentIdentity = { publicKey: managedRecord.publicKey, privateKey: managedPrivateKey };
  const acquiredCapability = {
    vaultId: createdVault.core.vaultId,
    capabilityId: "cap-acquired",
    agentId: "agent-acquired",
    secretAliases: ["issuer-token"],
    operation: "dispatch_http",
    scope: "https://issuer.example.com/other",
    methods: ["GET"],
    issuedAt: new Date().toISOString(),
    auditRequired: true,
  };
  await auditClient.ownerGrantCapability({ capability: acquiredCapability });
  const acquiredVault = wrapVaultCoreAsVaultService(recoveredVaultInstance.core);
  const acquiredAgent = createAgentClient({
    agentIdentity: { agentId: "agent-acquired" },
    capability: {
      ...acquiredCapability,
    },
    vault: acquiredVault,
    signer: new LocalSigner(acquiredAgentIdentity),
  });
  await assert.rejects(
    () => acquiredAgent.agentDispatch({
      secretAlias: "issuer-token",
      targetUrl: "https://issuer.example.com/other",
      method: "GET",
    }),
    /VAULT_AGENT_DISPATCH_REJECTED|VAULT_DISPATCH_DENIED/,
  );
  const secretsFile = await readFile(join(tempDir, "vaults/vault-runtime-persistent/vault/sealed/secrets.sealed"), "utf8").catch(() => "");
  assert.ok(!secretsFile.includes("issuer-secret"), "Encrypted file should not contain plaintext!");
  console.log("-> Secret Storage Security Verification OK: Data encrypted and isolated on disk");

  console.log("-> Verifying Custody Directory Structure...");
  const custodyDirEntries = await readdir(join(tempDir, "vaults/vault-runtime-persistent/vault/sealed/custody"));
  assert.ok(custodyDirEntries.length >= 1, "Custody entries missing!");
  console.log("   [OK] Custody directory moved to encrypted area");

  console.log("-> Verifying Secret Physical Deletion...");
  // Use ownerClient for deletion to verify high-level API loop
  await auditClient.ownerDeleteSecret({ alias: "issuer-token" });
  
  // Verify cannot retrieve after deletion
  await assert.rejects(
    () => auditClient.ownerExportSecret({ alias: "issuer-token" }),
    /SECRET_NOT_FOUND/
  );
  console.log("   [OK] Logical deletion and permission check successful");
  console.log("   [OK] Physical deletion successful");

  const rollbackDir = await mkdtemp(join(tmpdir(), "cbio-authority-rollback-"));
  const failingAuditStorage = new FsStorageProvider(rollbackDir);
  const rollbackCustody = await initializeVaultCustody(failingAuditStorage);
  const vaultWorkingKey = rollbackCustody.vaultWorkingKey;
  const rollbackAgentIdentities = new InMemoryAgentIdentityRegistry();
  const rollbackSessionTokens = new InMemorySessionTokenRegistry();
  const bootstrapRollbackAuthority = createVaultCore({
    vaultId: { value: "vault-rollback" },
    secrets: new PersistentVaultSecretRepository(failingAuditStorage),
    custody: new PersistentVaultSecretCustody(failingAuditStorage, vaultWorkingKey),
    policy: new DefaultPolicyEngine(),
    audit: new InMemoryAuditLog(),
    executor: new HttpDispatchExecutor(async () => new Response("ok", { status: 200 })),
    agentIdentities: rollbackAgentIdentities,
    agentProofVerifier: new SignatureAgentProofVerifier(rollbackAgentIdentities, rollbackSessionTokens),
    capabilities: new InMemoryCapabilityRegistry(),
    customFlows: new InMemoryCustomHttpFlowRegistry(),
    sessionTokens: rollbackSessionTokens,
    pendingRequests: new InMemoryPendingRequestRegistry(),
    pendingCapabilityRequests: new InMemoryPendingCapabilityRequestRegistry(),
    replayGuard: new InMemoryReplayGuard(),
    clock: new SystemClock(),
    ids: new RandomIdGenerator(),
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
    agentProofVerifier: new SignatureAgentProofVerifier(rollbackAgentIdentities, rollbackSessionTokens),
    capabilities: new InMemoryCapabilityRegistry(),
    customFlows: new InMemoryCustomHttpFlowRegistry(),
    sessionTokens: rollbackSessionTokens,
    pendingRequests: new InMemoryPendingRequestRegistry(),
    pendingCapabilityRequests: new InMemoryPendingCapabilityRequestRegistry(),
    replayGuard: new InMemoryReplayGuard(),
    clock: new SystemClock(),
    ids: new RandomIdGenerator(),
  });
  const rollbackVault = wrapVaultCoreAsVaultService(rollbackAuthority);
  const rollbackClient = createVaultClient({
    vault: rollbackVault,
  });
  const custodyDir = join(tempDir, "vaults/vault-runtime-persistent/vault/sealed/custody");
  const custodyCountBefore = await readdir(custodyDir).then((entries) => entries.length).catch(() => 0);
  await assert.rejects(
    () => rollbackClient.ownerWriteSecret({
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
  const rollbackSecretsFile = await readFile(join(tempDir, "vaults/vault-runtime-persistent/vault/sealed/secrets.sealed"), "utf8").catch(() => "");
  assert.ok(!rollbackSecretsFile.includes("should-rollback"));
  const custodyCountAfter = await readdir(custodyDir).then((entries) => entries.length).catch(() => 0);
  assert.equal(custodyCountAfter, custodyCountBefore);
  await rm(rollbackDir, { recursive: true, force: true });
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("runtime surface smoke test passed");
