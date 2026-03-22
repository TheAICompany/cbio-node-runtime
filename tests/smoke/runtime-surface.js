import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createChildIdentity,
  createVault,
  createWorkspaceStorage,
  deriveChildIdentity,
  ensureIdentityPrivateVault,
  getDefaultWorkspaceDir,
  readIdentityPrivateVaultChildrenState,
  readIdentityPrivateVaultProfile,
  recoverVault,
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
  InMemoryOwnerIdentityRegistry,
  InMemorySecretCustody,
  InMemorySecretRepository,
  PersistentVaultAuditLog,
  PersistentVaultSecretCustody,
  PersistentVaultSecretRepository,
  RandomIdGenerator,
  SignatureAgentProofVerifier,
  SignatureOwnerProofVerifier,
  SystemClock,
  initializeVaultCustody,
} from "../../dist/vault-core/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";
import { LocalSigner } from "../../dist/protocol/crypto.js";
import { MemoryStorageProvider } from "../../dist/storage/memory.js";
import {
  identityPrivateVaultChildrenKey,
  identityPrivateVaultProfileKey,
} from "../../dist/runtime/private-vault.js";
import { readVaultProfile } from "../../dist/runtime/vault-metadata.js";

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
const ownerIdentity = createIdentity({ nickname: "owner-1" });
const restoredAgentIdentity = restoreIdentity(agentIdentity.privateKey, { nickname: "agent-1-restored" });
const identityTreeStorage = new MemoryStorageProvider();
await ensureIdentityPrivateVault(identityTreeStorage, ownerIdentity);
const derivedAgentIdentity = await createChildIdentity(identityTreeStorage, ownerIdentity, { nickname: "worker-1" });
const derivedAgentIdentityAgain = deriveChildIdentity(ownerIdentity, 0, { nickname: "worker-2" });
const derivedAgentIdentitySibling = await createChildIdentity(identityTreeStorage, ownerIdentity, { nickname: "worker-3" });
const ownerPrivateVaultProfileBlob = (await identityTreeStorage.read(identityPrivateVaultProfileKey(ownerIdentity.identityId))).toString("utf8");
const ownerPrivateVaultChildrenBlob = (await identityTreeStorage.read(identityPrivateVaultChildrenKey(ownerIdentity.identityId))).toString("utf8");
const childPrivateVaultProfileBlob = (await identityTreeStorage.read(identityPrivateVaultProfileKey(derivedAgentIdentity.identityId))).toString("utf8");
const ownerPrivateVaultProfile = await readIdentityPrivateVaultProfile(identityTreeStorage, ownerIdentity.privateKey);
const ownerPrivateVaultChildren = await readIdentityPrivateVaultChildrenState(identityTreeStorage, ownerIdentity);
const childPrivateVaultProfile = await readIdentityPrivateVaultProfile(identityTreeStorage, derivedAgentIdentity.privateKey);
assert.equal(await identityTreeStorage.has(`identities/${ownerIdentity.identityId}/profile.json`), false);
assert.equal(await identityTreeStorage.has(`identities/${ownerIdentity.identityId}/children.json`), false);
assert.equal(ownerPrivateVaultProfileBlob.includes(ownerIdentity.identityId), false);
assert.equal(ownerPrivateVaultChildrenBlob.includes("\"children\""), false);
assert.equal(childPrivateVaultProfileBlob.includes(derivedAgentIdentity.identityId), false);
assert.equal(typeof agentIdentity.privateKey, "string");
assert.equal(typeof agentIdentity.publicKey, "string");
assert.equal(typeof agentIdentity.identityId, "string");
assert.equal(agentIdentity.nickname, "agent-1");
assert.equal(restoredAgentIdentity.privateKey, agentIdentity.privateKey);
assert.equal(restoredAgentIdentity.publicKey, agentIdentity.publicKey);
assert.equal(restoredAgentIdentity.identityId, agentIdentity.identityId);
assert.equal(restoredAgentIdentity.nickname, "agent-1-restored");
assert.ok(ownerPrivateVaultProfile);
assert.ok(childPrivateVaultProfile);
assert.equal(ownerPrivateVaultProfile.identityId, ownerIdentity.identityId);
assert.equal(ownerPrivateVaultChildren.nextChildIndex, 2);
assert.equal(ownerPrivateVaultChildren.children.length, 2);
assert.equal(childPrivateVaultProfile.parentIdentityId, ownerIdentity.identityId);
assert.equal(derivedAgentIdentity.parentIdentityId, ownerIdentity.identityId);
assert.equal(derivedAgentIdentity.childIndex, 0);
assert.equal(derivedAgentIdentity.privateKey, derivedAgentIdentityAgain.privateKey);
assert.equal(derivedAgentIdentity.publicKey, derivedAgentIdentityAgain.publicKey);
assert.equal(derivedAgentIdentity.identityId, derivedAgentIdentityAgain.identityId);
assert.notEqual(derivedAgentIdentity.privateKey, derivedAgentIdentitySibling.privateKey);
assert.notEqual(derivedAgentIdentity.identityId, derivedAgentIdentitySibling.identityId);
assert.equal(derivedAgentIdentity.nickname, "worker-1");
assert.equal(derivedAgentIdentityAgain.nickname, "worker-2");
assert.equal(derivedAgentIdentitySibling.childIndex, 1);

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
  publicKey: ownerIdentity.publicKey,
});

const client = createVaultClient({
  ownerIdentity: { identityId: "owner-1" },
  vault,
  signer: new LocalSigner(ownerIdentity),
  clock: new SystemClock(),
});
assert.equal(typeof client.storeSecret, "function");
assert.equal(typeof client.defineSecretTargets, "function");
await client.registerAgent({
  agentId: "agent-1",
  publicKey: agentIdentity.publicKey,
});
const ownedRecord = await client.writeSecret({
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

const exportedSecret = await client.exportSecret({ alias: "api-token" });
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
await client.grantCapability({ capability: dispatchCapability });

const agent = createAgentClient({
  agentIdentity: { agentId: "agent-1" },
  capability: {
    ...dispatchCapability,
  },
  vault,
  signer: new LocalSigner(agentIdentity),
});

const result = await agent.dispatch({
  secretAlias: "api-token",
  targetUrl: "https://api.example.com/endpoint",
  method: "POST",
  body: '{"hello":"world"}',
});

assert.equal(result.status, "succeeded");
assert.equal(seenAuthHeader, "Bearer super-secret");
assert.equal(result.responseBody, "ok");

await client.registerFlow({
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
await client.grantCapability({ capability: customCapability });

const customAgent = createAgentClient({
  agentIdentity: { agentId: "agent-1" },
  capability: {
    ...customCapability,
  },
  vault,
  signer: new LocalSigner(agentIdentity),
});

const customResult = await customAgent.dispatch({
  secretAlias: "api-token",
  targetUrl: "https://api.example.com/custom-status",
  method: "POST",
  body: '{"mode":"custom"}',
});

assert.equal(customResult.status, "succeeded");
assert.equal(customResult.responseBody, JSON.stringify({ state: null, nested: { code: null } }));

await client.registerFlow({
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
await client.grantCapability({ capability: customAcquireCapability });

const customAcquireAgent = createAgentClient({
  agentIdentity: { agentId: "agent-1" },
  capability: {
    ...customAcquireCapability,
  },
  vault,
  signer: new LocalSigner(agentIdentity),
});

const customAcquireResult = await customAcquireAgent.dispatch({
  targetUrl: "https://api.example.com/custom-acquire",
  method: "POST",
});

assert.equal(customAcquireResult.status, "succeeded");
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
    ownerIdentity,
    vault: {
      fetchImpl: async () => new Response(JSON.stringify({
        access_token: "issuer-secret",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "read write",
      }), { status: 200 }),
    },
  });
  const createdVaultProfile = await readVaultProfile(createdVault.storage);
  assert.equal(createdVault.nickname, "persistent-main");
  assert.equal(createdVaultProfile?.nickname, "persistent-main");
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
  const auditClient = createVaultClient({ ownerIdentity, vault: persistentVault });
  const audit = await auditClient.readAudit({ secretAlias: "issuer-token" });
  assert.ok(audit.length >= 1);
  const persistentExport = await auditClient.exportSecret({ alias: "issuer-token" });
  assert.equal(persistentExport.plaintext, "issuer-secret");
  const recoveredVaultInstance = await recoverVault(storage, {
    vaultId: "vault-runtime-persistent",
    ownerIdentity,
  });
  assert.equal(recoveredVaultInstance.nickname, "persistent-main");

  const defaultWorkspaceDir = await mkdtemp(join(tmpdir(), "cbio-default-workspace-"));
  process.env.C_BIO_WORKSPACE_DIR = defaultWorkspaceDir;
  const autoCreatedVault = await createVault({
    vaultId: "vault-runtime-default-storage",
    nickname: "default-storage-vault",
    ownerIdentity,
  });
  assert.equal(autoCreatedVault.nickname, "default-storage-vault");
  assert.equal(await autoCreatedVault.storage.has("vault/profile.json"), true);
  assert.equal(await autoCreatedVault.storage.has("vault/secrets.json"), false);
  const autoRecoveredVault = await recoverVault({
    vaultId: "vault-runtime-default-storage",
    ownerIdentity,
  });
  assert.equal(autoRecoveredVault.nickname, "default-storage-vault");
  const siblingVault = await createVault(storage, {
    vaultId: "vault-runtime-sibling",
    nickname: "sibling-vault",
    ownerIdentity,
  });
  const siblingProfile = await readVaultProfile(siblingVault.storage);
  assert.equal(siblingProfile?.nickname, "sibling-vault");
  assert.equal(await storage.has("vaults/vault-runtime-persistent/vault/profile.json"), true);
  assert.equal(await storage.has("vaults/vault-runtime-sibling/vault/profile.json"), true);
  assert.equal(await siblingVault.storage.has("vault/profile.json"), true);
  assert.equal(await siblingVault.storage.has("vaults/vault-runtime-sibling/vault/profile.json"), false);
  delete process.env.C_BIO_WORKSPACE_DIR;
  const acquiredAgentIdentity = createIdentity();
  await auditClient.registerAgent({ agentId: "agent-acquired", publicKey: acquiredAgentIdentity.publicKey });
  const acquiredCapability = {
    vaultId: createdVault.core.vaultId,
    capabilityId: "cap-acquired",
    agentId: "agent-acquired",
    secretAliases: ["issuer-token"],
    operation: "dispatch_http",
    allowedTargets: ["https://issuer.example.com/other"],
    allowedMethods: ["GET"],
    issuedAt: new Date().toISOString(),
    auditRequired: true,
  };
  await auditClient.grantCapability({ capability: acquiredCapability });
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
    () => acquiredAgent.dispatch({
      secretAlias: "issuer-token",
      targetUrl: "https://issuer.example.com/other",
      method: "GET",
    }),
    /VAULT_AGENT_DISPATCH_REJECTED|VAULT_DISPATCH_DENIED/,
  );
  const secretsFile = await readFile(join(tempDir, "vaults/vault-runtime-persistent/vault/secrets.json"), "utf8");
  assert.ok(!secretsFile.includes("issuer-secret"));
  const custodyDirEntries = await readdir(join(tempDir, "vaults/vault-runtime-persistent/vault/custody"));
  assert.ok(custodyDirEntries.length >= 1);

  const rollbackDir = await mkdtemp(join(tmpdir(), "cbio-authority-rollback-"));
  const failingAuditStorage = new FsStorageProvider(rollbackDir);
  const rollbackCustody = await initializeVaultCustody(failingAuditStorage);
  const vaultWorkingKey = rollbackCustody.vaultWorkingKey;
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
    publicKey: ownerIdentity.publicKey,
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
  const rollbackClient = createVaultClient({
    ownerIdentity: { identityId: "owner-rollback" },
    vault: rollbackVault,
    signer: new LocalSigner(ownerIdentity),
  });
  const custodyDir = join(tempDir, "vaults/vault-runtime-persistent/vault/custody");
  const custodyCountBefore = await readdir(custodyDir).then((entries) => entries.length).catch(() => 0);
  await assert.rejects(
    () => rollbackClient.writeSecret({
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
  const rollbackSecretsFile = await readFile(join(tempDir, "vaults/vault-runtime-persistent/vault/secrets.json"), "utf8").catch(() => "");
  assert.ok(!rollbackSecretsFile.includes("should-rollback"));
  const custodyCountAfter = await readdir(custodyDir).then((entries) => entries.length).catch(() => 0);
  assert.equal(custodyCountAfter, custodyCountBefore);
  await rm(rollbackDir, { recursive: true, force: true });
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("runtime surface smoke test passed");
