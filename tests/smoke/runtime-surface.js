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
  createOwnerClient,
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
  createVaultCoreDependencies,
  DefaultPolicyEngine,
  HttpDispatchExecutor,
  InMemoryAgentIdentityRegistry,
  InMemoryAuditLog,
  InMemoryAgentSecretGrantRegistry,
  InMemorySecretDestinationGrantRegistry,
  InMemoryReplayGuard,
  InMemorySecretCustody,
  InMemorySecretRepository,
  InMemorySessionTokenRegistry,
  InMemoryRequestRecordRegistry,
  InMemorySiteRegistry,
  RandomIdGenerator,
  SignatureAgentProofVerifier,
  SystemClock,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";
import { LocalSigner } from "../../dist/protocol/crypto.js";
import { MemoryStorageProvider } from "../../dist/storage/memory.js";

/**
 * Modern Smoke Test: Runtime Surface (v1.65.0)
 * Verifies all high-level runtime APIs and core kernel integration.
 */
async function runSmokeTest() {
  console.log("🚀 Starting Runtime Surface Smoke Test...");

  // --- 1. Identity & Signer ---
  const agentRecord = createIdentity({ nickname: "agent-1" });
  const restoredAgentIdentity = restoreIdentity(agentRecord.private_key, { nickname: "agent-1-restored" });

  assert.equal(typeof agentRecord.private_key, "string");
  assert.equal(agentRecord.nickname, "agent-1");
  assert.equal(restoredAgentIdentity.root_agent_id, agentRecord.root_agent_id);

  // --- 2. In-Memory Operations ---
  let seenAuthHeader = null;
  const runtimeSurfaceFetch = async (url, init) => {
    seenAuthHeader = new Headers(init?.headers).get("Authorization");
    return new Response("ok", { status: 200 });
  };

  const runtimeSurfaceAgentIdentities = new InMemoryAgentIdentityRegistry();
  const runtimeSurfaceSessionTokenRegistry = new InMemorySessionTokenRegistry();
  const authority = createVaultCore({
    vault_id: "vault-runtime-surface",
    secrets: new InMemorySecretRepository(),
    custody: new InMemorySecretCustody(),
    policy: new DefaultPolicyEngine(),
    audit: new InMemoryAuditLog(),
    executor: new HttpDispatchExecutor(runtimeSurfaceFetch),
    agentRecords: runtimeSurfaceAgentIdentities,
    agent_secretGrants: new InMemoryAgentSecretGrantRegistry(),
    secret_destinationGrants: new InMemorySecretDestinationGrantRegistry(),
    agentProofVerifier: new SignatureAgentProofVerifier(runtimeSurfaceAgentIdentities, runtimeSurfaceSessionTokenRegistry),
    sessionTokenRegistry: runtimeSurfaceSessionTokenRegistry,
    replayGuard: new InMemoryReplayGuard(),
    clock: new SystemClock(),
    ids: new RandomIdGenerator(),
    requests: new InMemoryRequestRecordRegistry(),
    sites: new InMemorySiteRegistry(),
  });

  const vault = wrapVaultCoreAsVaultService(authority, { fetchImpl: runtimeSurfaceFetch });
  const client = await createOwnerClient({
    vault,
    password_verifier: async (password) => password === "password-1",
  });

  const imported = await client.ownerImportAgent({ private_key: agentRecord.private_key });
  const importedAgentId = imported.agent.root_agent_id;

  const ownedRecord = await client.ownerCreateSecret({ alias: "api-token", plaintext: "secret-v1" });
  assert.ok(typeof ownedRecord.version === "string");

  await client.ownerGrantAgentSecret({ root_agent_id: importedAgentId, secret_alias: "api-token" });
  await client.ownerCreateSite({ domain: "api.example.com" });
  await client.ownerGrantSecretDestination({ secret_alias: "api-token", site_id: "api.example.com" });

  const agentSession = await client.ownerIssueSessionToken({ root_agent_id: importedAgentId });
  const agent = createAgentClient({
    agentRecord: imported.agent,
    vault,
    token: agentSession.token,
  });

  const result = await agent.agentDispatch({
    secret_alias: "api-token",
    target_url: "https://api.example.com/endpoint",
    method: "POST",
    reason: "Verification request",
  });
  if (result.status !== "SUCCEEDED") {
    console.error("❌ Dispatch failed:", JSON.stringify(result, null, 2));
  }
  assert.equal(result.status, "SUCCEEDED");
  assert.equal(seenAuthHeader, "Bearer secret-v1");

  const agentRequestDetail = await agent.agentGetRequest(result.request_id);
  assert.equal(agentRequestDetail.execution.status, "SUCCEEDED");
  assert.equal(agentRequestDetail.request.target_url, "https://api.example.com/endpoint");
  assert.equal(agentRequestDetail.request.method, "POST");
  assert.equal(agentRequestDetail.response?.status, 200);
  assert.equal(agentRequestDetail.response?.body, "ok");
  assert.equal(agentRequestDetail.response?.headers?.["content-type"], "text/plain;charset=UTF-8");
  assert.ok(typeof agentRequestDetail.created_at === "string");
  assert.ok(typeof agentRequestDetail.requested_at === "string");

  const ownerRequestDetail = await client.ownerGetRequest({ request_id: result.request_id });
  assert.equal(ownerRequestDetail.execution.status, "SUCCEEDED");
  assert.equal(ownerRequestDetail.request.target_url, "https://api.example.com/endpoint");
  assert.equal(ownerRequestDetail.request.method, "POST");
  assert.equal(ownerRequestDetail.response?.status, 200);
  assert.equal(ownerRequestDetail.response?.body, "ok");
  assert.equal(ownerRequestDetail.response?.headers?.["content-type"], "text/plain;charset=UTF-8");
  assert.ok(typeof ownerRequestDetail.created_at === "string");
  assert.ok(typeof ownerRequestDetail.requested_at === "string");

  const replacementSession = await client.ownerIssueSessionToken({ root_agent_id: importedAgentId });
  await assert.rejects(
    agent.agentDispatch({
      secret_alias: "api-token",
      target_url: "https://api.example.com/endpoint",
      method: "POST",
      reason: "Superseded token should fail",
    }),
    /pending approval|session token not found/,
  );

  const listedAgents = await client.ownerListAgents();
  const listedAgent = listedAgents.find((entry) => entry.root_agent_id === importedAgentId);
  assert.equal(listedAgent?.session_token?.token, replacementSession.token);

  let releaseSlowDispatch;
  const slowDispatchStarted = new Promise((resolve) => {
    releaseSlowDispatch = resolve;
  });
  const slowFetch = async (url, init) => {
    seenAuthHeader = new Headers(init?.headers).get("Authorization");
    await slowDispatchStarted;
    return new Response("slow-ok", { status: 200 });
  };
  const slowAgentIdentities = new InMemoryAgentIdentityRegistry();
  const slowSessionTokenRegistry = new InMemorySessionTokenRegistry();

  const slowAuthority = createVaultCore({
    vault_id: "vault-runtime-surface-slow",
    secrets: new InMemorySecretRepository(),
    custody: new InMemorySecretCustody(),
    policy: new DefaultPolicyEngine(),
    audit: new InMemoryAuditLog(),
    executor: new HttpDispatchExecutor(slowFetch),
    agentRecords: slowAgentIdentities,
    agent_secretGrants: new InMemoryAgentSecretGrantRegistry(),
    secret_destinationGrants: new InMemorySecretDestinationGrantRegistry(),
    agentProofVerifier: new SignatureAgentProofVerifier(slowAgentIdentities, slowSessionTokenRegistry),
    sessionTokenRegistry: slowSessionTokenRegistry,
    replayGuard: new InMemoryReplayGuard(),
    clock: new SystemClock(),
    ids: new RandomIdGenerator(),
    requests: new InMemoryRequestRecordRegistry(),
    sites: new InMemorySiteRegistry(),
  });
  const slowVault = wrapVaultCoreAsVaultService(slowAuthority, { fetchImpl: slowFetch });
  const slowOwnerClient = await createOwnerClient({
    vault: slowVault,
    password_verifier: async (password) => password === "password-1",
  });
  const slowImported = await slowOwnerClient.ownerImportAgent({ private_key: agentRecord.private_key });
  await slowOwnerClient.ownerCreateSecret({ alias: "slow-token", plaintext: "secret-slow" });
  await slowOwnerClient.ownerGrantAgentSecret({ root_agent_id: slowImported.agent.root_agent_id, secret_alias: "slow-token" });
  await slowOwnerClient.ownerCreateSite({ domain: "api.example.com" });
  await slowOwnerClient.ownerGrantSecretDestination({ secret_alias: "slow-token", site_id: "api.example.com" });
  const slowSession = await slowOwnerClient.ownerIssueSessionToken({ root_agent_id: slowImported.agent.root_agent_id });
  const slowAgent = createAgentClient({
    agentRecord: slowImported.agent,
    vault: slowVault,
    token: slowSession.token,
  });

  const slowDispatchPromise = slowAgent.agentDispatch({
    secret_alias: "slow-token",
    target_url: "https://api.example.com/slow-endpoint",
    method: "POST",
    reason: "Slow verification request",
  });

  await new Promise((resolve) => setImmediate(resolve));
  const inFlightRequests = await slowOwnerClient.ownerListRequests({ root_agent_id: slowImported.agent.root_agent_id });
  assert.ok(inFlightRequests.some((request) => request.execution.status === "IN_PROGRESS"), "In-flight dispatch should be recorded before completion");

  releaseSlowDispatch();
  const slowResult = await slowDispatchPromise;
  assert.equal(slowResult.status, "SUCCEEDED");

  // --- 3. Persistence & Recovery ---
  const tempDir = await mkdtemp(join(tmpdir(), "cbio-runtime-persist-"));
  try {
    const storage = new FsStorageProvider(tempDir);
    const { vault: persistentVault, core: persistentCore } = await createVault(storage, {
      nickname: "Persistent Vault",
      password: "master-pw",
    });

    const persistentClient = await createOwnerClient({ vault: persistentVault, password_verifier: async (pw) => pw === "master-pw" });
    await persistentClient.ownerCreateSecret({ alias: "p-secret", plaintext: "i-am-persistent" });

    // Simulate recovery
    const recovered = await recoverVault(storage, { 
      vault_id: persistentCore.vault_id,
      password: "master-pw" 
    });
    assert.equal(recovered.vault.vault_id, persistentCore.vault_id);

    const recoveredClient = await createOwnerClient({ vault: recovered.vault });
    const secrets = await recoveredClient.ownerListSecrets();
    assert.ok(secrets.some(s => s.alias === "p-secret"));

    console.log("Persistence & Recovery verified.");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  console.log("✅ Runtime Surface Smoke Test Passed!");
}

runSmokeTest().catch(err => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
