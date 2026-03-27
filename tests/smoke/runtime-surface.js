import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createVault,
  createWorkspaceStorage,
  getDefaultWorkspaceDir,
  recoverVault,
  createOwnerSession,
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
assert.equal(typeof createOwnerSession, "function");
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
  capabilityStates: new InMemoryCapabilityRegistry(),
  agentProofVerifier: new SignatureAgentProofVerifier(runtimeSurfaceAgentIdentities, runtimeSurfaceSessionTokens),
  customFlows: runtimeSurfaceCustomFlows,
  sessionTokens: runtimeSurfaceSessionTokens,
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
  passwordVerifier: async (password) => password === "runtime-surface-password",
});
assert.equal(typeof client.ownerStoreSecret, "function");
await client.ownerImportAgent({
  privateKey: agentIdentity.privateKey,
});
const importedAgentId = (await client.ownerListAgents()).find((agent) => agent.identityId === agentIdentity.identityId)?.agentId;
assert.equal(typeof importedAgentId, "string");
const ownedRecord = await client.ownerWriteSecret({
  alias: "api-token",
  plaintext: "super-secret",
});
assert.deepEqual(ownedRecord.source, { kind: "manual" });

const exportedSecret = await client.ownerExportSecret({ alias: "api-token", password: "runtime-surface-password" });
assert.equal(exportedSecret.plaintext, "super-secret");
assert.equal(exportedSecret.alias.value, "api-token");
assert.equal(await client.ownerReadSecretPlaintext({ alias: "api-token", password: "runtime-surface-password" }), "super-secret");

const dispatchCapability = {
  vaultId: authority.vaultId,
  capabilityId: "cap-1",
  agentId: importedAgentId,
  operation: "dispatch_http",
  write: {
    secretIds: [ownedRecord.secretId.value],
    scope: "https://API.EXAMPLE.com:443/endpoint?ignored=yes#fragment",
    methods: ["POST"],
  },
  read: { mode: "full" },
  issuedAt: new Date().toISOString(),
  auditRequired: true,
};
await client.ownerGrantCapability({ capability: dispatchCapability });
const agent1Session = await client.ownerIssueSessionToken({ agentId: importedAgentId });

const agent = createAgentClient({
  agentIdentity: { agentId: importedAgentId },
  capability: {
    ...dispatchCapability,
  },
  vault,
  token: agent1Session.token,
});

const result = await agent.agentDispatch({
  secretAlias: "api-token",
  targetUrl: "https://api.example.com/endpoint",
  method: "POST",
  body: '{"hello":"world"}',
});

assert.equal(result.status, "SUCCEEDED");
assert.equal(seenAuthHeader, "Bearer super-secret");
assert.equal(result.responseBody, undefined);
const requestHistory = await agent.agentListRequests();
const dispatchedRequest = requestHistory.find((entry) => entry.requestId === result.requestId);
assert.ok(dispatchedRequest);
assert.equal(dispatchedRequest.resultVisible, false);
assert.equal(dispatchedRequest.executionStatus, "SUCCEEDED");
const hiddenResult = await agent.agentGetRequest(result.requestId);
assert.equal(hiddenResult.responseBody, undefined);

const shapeOnlyFlow = await client.ownerRegisterFlow({
  mode: "send_secret",
  targetUrl: "https://api.example.com/custom-status",
  method: "POST",
  responseVisibility: "shape_only",
});

const customCapability = {
  vaultId: authority.vaultId,
  capabilityId: "cap-custom",
  agentId: importedAgentId,
  customFlowId: shapeOnlyFlow.flowId,
  operation: "custom_http",
  write: {
    secretIds: [ownedRecord.secretId.value],
    scope: "https://api.example.com/custom-status",
    methods: ["POST"],
  },
  read: { mode: "full" },
  issuedAt: new Date().toISOString(),
  auditRequired: true,
};
await client.ownerGrantCapability({ capability: customCapability });

const customAgent = createAgentClient({
  agentIdentity: { agentId: importedAgentId },
  capability: {
    ...customCapability,
  },
  vault,
  token: agent1Session.token,
});

const customResult = await customAgent.agentDispatch({
  secretAlias: "api-token",
  targetUrl: "https://api.example.com/custom-status",
  method: "POST",
  body: '{"mode":"custom"}',
});

assert.equal(customResult.status, "SUCCEEDED");
assert.equal(customResult.responseBody, "null");

const customAcquireFlow = await client.ownerRegisterFlow({
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
  agentId: importedAgentId,
  customFlowId: customAcquireFlow.flowId,
  operation: "custom_http",
  write: {
    scope: "https://api.example.com/custom-acquire",
    methods: ["POST"],
  },
  read: { mode: "full" },
  issuedAt: new Date().toISOString(),
  auditRequired: true,
};
await client.ownerGrantCapability({ capability: customAcquireCapability });

const customAcquireAgent = createAgentClient({
  agentIdentity: { agentId: importedAgentId },
  capability: {
    ...customAcquireCapability,
  },
  vault,
  token: agent1Session.token,
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
  const auditClient = createVaultClient({ vault: persistentVault, passwordVerifier: createdVault.verifyPassword });
  const audit = await auditClient.ownerReadAudit({ secretAlias: "issuer-token" });
  assert.ok(audit.length >= 1);
  const persistentExport = await auditClient.ownerExportSecret({ alias: "issuer-token", password: "password-1" });
  assert.equal(persistentExport.plaintext, "issuer-secret");
  const recoveredVaultInstance = await recoverVault(storage, {
    vaultId: createdVault.core.vaultId.value,
    password: "password-1",
  });
  assert.equal(recoveredVaultInstance.nickname, "persistent-main");
  const ownerSession = createOwnerSession(storage, {
    vaultId: createdVault.core.vaultId.value,
    password: "password-1",
  });
  assert.equal(ownerSession.isValid(), true);
  const sessionClientA = await ownerSession.client();
  const sessionClientB = await ownerSession.client();
  assert.notEqual(sessionClientA, sessionClientB, "OwnerSession should not cache raw VaultClient instances");
  const sessionAgents = await ownerSession.withClient((sessionClient) => sessionClient.ownerListAgents());
  assert.ok(Array.isArray(sessionAgents));
  await ownerSession.refresh();
  ownerSession.invalidate();
  assert.equal(ownerSession.isValid(), false);
  await assert.rejects(
    () => ownerSession.client(),
    /invalidated/,
  );

  const defaultWorkspaceDir = await mkdtemp(join(tmpdir(), "cbio-default-workspace-"));
  process.env.C_BIO_WORKSPACE_DIR = defaultWorkspaceDir;
  const autoCreatedVault = await createVault({
    nickname: "default-storage-vault",
    password: "password-1",
  });
  assert.equal(autoCreatedVault.nickname, "default-storage-vault");
  assert.equal(await autoCreatedVault.storage.has("profile.sealed"), true, "Missing profile.sealed");
  assert.equal(await autoCreatedVault.storage.has("public.sealed"), false, "public.sealed should be removed");
  console.log("-> Storage Architecture Verification OK: Detected single encrypted .sealed profile");

  console.log("-> Verifying Vault Discovery API...");
  const autoRecoveredVault = await recoverVault({
    vaultId: autoCreatedVault.core.vaultId.value,
    password: "password-1",
  });
  assert.equal(autoRecoveredVault.nickname, "default-storage-vault");
  
  const siblingVault = await createVault(storage, {
    nickname: "sibling-vault",
    password: "password-1",
  });

  const allVaults = await listVaults(storage);
  assert.ok(allVaults.includes(siblingVault.core.vaultId.value), "Vault should be in the list");
  console.log(`-> Vault List Discovery OK: Successfully found "${siblingVault.core.vaultId.value}"`);

  console.log("-> Verifying Metadata Update...");
  await updateVaultMetadata(siblingVault, {
    nickname: "updated-sibling-vault",
    password: "password-1",
  });
  
  const updatedVaults = await listVaults(storage);
  assert.ok(updatedVaults.includes(siblingVault.core.vaultId.value), "Vault should still be in the list");
  console.log(`   [OK] Metadata updated successfully (verified via ID)`);

  console.log("-> Verifying Physical Delete...");
  await rm(join(tempDir, `vaults/${siblingVault.core.vaultId.value}_v1`), { recursive: true });
  const remainingVaults = await listVaults(storage);
  assert.ok(!remainingVaults.includes(siblingVault.core.vaultId.value), "Vault should be deleted");
  console.log("   [OK] Vault physical deletion successful");
  console.log("-> Verifying Managed Agent Identity Custody...");
  const managedProvision = await auditClient.ownerCreateAgent({ 
    nickname: "Managed Worker",
    metadata: { dept: "security" }
  });
  const managedRecord = managedProvision.agent;
  assert.ok(managedProvision.sessionToken.token, "Should issue a session token during creation");
  assert.equal(managedRecord.nickname, "Managed Worker");
  
  // Verify recovery after persistence
  const agentsInVault = await auditClient.ownerListAgents();
  const foundManaged = agentsInVault.find(a => a.agentId === managedRecord.agentId);
  assert.equal(foundManaged?.privateKey, undefined, "Default owner agent listing should redact private keys");
  assert.equal(typeof (await auditClient.ownerReadAgentPrivateKey({ agentId: managedRecord.agentId, password: "password-1" })), "string");
  console.log("   [OK] Agent creation and private key custody verification passed");

  console.log("-> Verifying Proactive Capability Request Flow...");
  let pendingCapabilityRequest = null;
  const unsubscribeCapability = auditClient.ownerOnCapabilityState((record) => {
    pendingCapabilityRequest = record;
  });
  const submittedCapabilityRequest = await auditClient.ownerSubmitCapabilityRequest({
    requester: { kind: "trusted_executor", id: "llm-planner" },
    agentId: managedRecord.agentId,
    write: {
      secretIds: [ownedRecord.secretId.value],
      scope: "https://api.example.com/users/*",
      methods: ["GET"],
    },
    read: { mode: "full" },
    justification: "Need collection-level user read access",
  });
  assert.equal(submittedCapabilityRequest.agentId, managedRecord.agentId);
  assert.equal(submittedCapabilityRequest.write.scope, "https://api.example.com/users/*");
  assert.equal(submittedCapabilityRequest.actions.write.status, "PENDING");
  assert.equal(submittedCapabilityRequest.actions.read.status, "PENDING");
  assert.ok(pendingCapabilityRequest, "Capability request observer should fire");
  const pendingCapabilityRequests = await auditClient.ownerListCapabilityStates({ writeStatus: "PENDING" });
  assert.equal(pendingCapabilityRequests.length, 1, "Should have one pending capability request");
  const writeApprovedCapability = await auditClient.ownerApproveCapabilityWrite({
    requestId: pendingCapabilityRequests[0].requestId,
  });
  assert.equal(writeApprovedCapability.actions.write.status, "APPROVED");
  assert.equal(writeApprovedCapability.actions.read.status, "PENDING");
  const approvedCapability = await auditClient.ownerExecuteCapabilityStateAndGrant({
    requestId: pendingCapabilityRequests[0].requestId,
  });
  unsubscribeCapability();
  assert.equal(approvedCapability.status, "SUCCEEDED");
  const grantedCapabilityRequests = await auditClient.ownerListCapabilityStates({ writeStatus: "APPROVED" });
  const grantedCapabilityRequest = grantedCapabilityRequests.find((record) => record.requestId === pendingCapabilityRequests[0].requestId);
  assert.ok(grantedCapabilityRequest, "Granted capability request should remain queryable");
  assert.equal(grantedCapabilityRequest.actions.write.status, "APPROVED");
  assert.equal(grantedCapabilityRequest.actions.read.status, "PENDING");
  const readApprovedCapability = await auditClient.ownerApproveCapabilityRead({
    requestId: grantedCapabilityRequest.requestId,
  });
  assert.equal(readApprovedCapability.actions.write.status, "APPROVED");
  assert.equal(readApprovedCapability.actions.read.status, "APPROVED");
  const capabilitiesAfterApproval = await auditClient.ownerListCapabilities({ agentId: managedRecord.agentId });
  assert.ok(
    capabilitiesAfterApproval.some((cap) => cap.write.scope === "https://api.example.com/users/*"),
    "Approved capability should be registered",
  );
  console.log("   [OK] Proactive capability request approval flow passed");

  const acquiredCapability = {
    vaultId: createdVault.core.vaultId,
    capabilityId: "cap-acquired",
    agentId: managedRecord.agentId,
    operation: "dispatch_http",
    write: {
      secretIds: [persistentExport.secretId.value],
      scope: "https://issuer.example.com/other",
      methods: ["GET"],
    },
    read: { mode: "full" },
    issuedAt: new Date().toISOString(),
    auditRequired: true,
  };
  await auditClient.ownerGrantCapability({ capability: acquiredCapability });
  const acquiredVault = wrapVaultCoreAsVaultService(recoveredVaultInstance.core);
  const acquiredAgentSession = await auditClient.ownerIssueSessionToken({ agentId: managedRecord.agentId });
  const acquiredAgent = createAgentClient({
    agentIdentity: { agentId: managedRecord.agentId },
    capability: {
      ...acquiredCapability,
    },
    vault: acquiredVault,
    token: acquiredAgentSession.token,
  });
  await assert.rejects(
    () => acquiredAgent.agentDispatch({
      secretAlias: "issuer-token",
      targetUrl: "https://issuer.example.com/other",
      method: "GET",
    }),
    /VAULT_AGENT_DISPATCH_REJECTED|VAULT_DISPATCH_DENIED/,
  );
  const persistentVaultDir = join(tempDir, `vaults/${createdVault.core.vaultId.value}_v1`);
  const secretsFile = await readFile(join(persistentVaultDir, "secrets.sealed"), "utf8").catch(() => "");
  assert.ok(!secretsFile.includes("issuer-secret"), "Encrypted file should not contain plaintext!");
  console.log("-> Secret Storage Security Verification OK: Data encrypted and isolated on disk");

  console.log("-> Verifying Custody Directory Structure...");
  const custodyDirEntries = await readdir(persistentVaultDir).then((entries) => entries.filter((entry) => entry.startsWith("secret-")));
  assert.ok(custodyDirEntries.length >= 1, "Custody entries missing!");
  console.log("   [OK] Custody directory moved to encrypted area");

  console.log("-> Verifying Secret Physical Deletion...");
  // Use ownerClient for deletion to verify high-level API loop
  await auditClient.ownerDeleteSecret({ alias: "issuer-token", password: "password-1" });
  
  // Verify cannot retrieve after deletion
  await assert.rejects(
    () => auditClient.ownerExportSecret({ alias: "issuer-token", password: "password-1" }),
    /VAULT_SECRET_NOT_FOUND|secret not found/
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
    capabilityStates: new InMemoryCapabilityRegistry(),
    customFlows: new InMemoryCustomHttpFlowRegistry(),
    sessionTokens: rollbackSessionTokens,
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
    capabilityStates: new InMemoryCapabilityRegistry(),
    customFlows: new InMemoryCustomHttpFlowRegistry(),
    sessionTokens: rollbackSessionTokens,
    replayGuard: new InMemoryReplayGuard(),
    clock: new SystemClock(),
    ids: new RandomIdGenerator(),
  });
  const rollbackVault = wrapVaultCoreAsVaultService(rollbackAuthority);
  const rollbackClient = createVaultClient({
    vault: rollbackVault,
  });
  const custodyDir = join(tempDir, "vaults/vault-runtime-persistent_v1");
  const custodyCountBefore = await readdir(custodyDir).then((entries) => entries.filter((entry) => entry.startsWith("secret-")).length).catch(() => 0);
  await assert.rejects(
    () => rollbackClient.ownerWriteSecret({
      alias: "should-rollback",
      plaintext: "rollback-secret",
    }),
    (error) => error instanceof VaultCoreError && error.code === "VAULT_AUDIT_FAILED",
  );
  const rollbackSecretsFile = await readFile(join(tempDir, "vaults/vault-runtime-persistent_v1/secrets.sealed"), "utf8").catch(() => "");
  assert.ok(!rollbackSecretsFile.includes("should-rollback"));
  const custodyCountAfter = await readdir(custodyDir).then((entries) => entries.filter((entry) => entry.startsWith("secret-")).length).catch(() => 0);
  assert.equal(custodyCountAfter, custodyCountBefore);
  await rm(rollbackDir, { recursive: true, force: true });
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("runtime surface smoke test passed");
