import { createVault, createVaultClient, createAgentClient, MemoryStorageProvider } from '../../dist/runtime/index.js';
import assert from 'node:assert';

async function testHitlApproval() {
  console.log('--- Testing HITL Approval Flow ---');

  // 1. Setup Vault and Clients
  const { vault } = await createVault(new MemoryStorageProvider(), {
    nickname: 'HITL Test Vault',
    password: 'hitl-test-password',
  });

  const ownerClient = createVaultClient({
    vault,
    ownerIdentity: { identityId: 'owner-1' }
  });

  // 2. Create and Register Agent
  const provisionedAgent = await ownerClient.ownerCreateAgent({
  });
  const vaultAgentId = provisionedAgent.agent.agentId;

  // 3. Register a Secret
  const secretRecord = await ownerClient.ownerCreateSecret({
    alias: 'top-secret',
    plaintext: 'shhh!',
  });

  // 4. Grant Capability (NO LONGER REQUIRES EXPLICIT FLAG)
  await ownerClient.ownerGrantCapability({
    agentId: vaultAgentId,
    write: {
      secretIds: [secretRecord.secretId.value],
      scope: 'https://api.example.com/*',
      methods: ['POST'],
    },
    read: { paths: ['$'] },
    // requiresApproval: true removed
  });

  const capabilities = await ownerClient.ownerListCapabilities({ agentId: vaultAgentId });
  const agentClient = createAgentClient({
    agentIdentity: { agentId: vaultAgentId },
    capability: capabilities[0],
    vault,
    token: provisionedAgent.sessionToken.token,
  });

  // 5. Agent attempts dispatch -> Should be ALLOWED (already in whitelist)
  console.log('Agent dispatching request (on whitelist)...');
  const result1 = await agentClient.agentDispatch({
    targetUrl: 'https://api.example.com/data',
    method: 'POST',
    secretAlias: 'top-secret',
    reason: 'Need to send the test request to the whitelisted endpoint.',
    body: 'ping'
  });

  console.log('Result status:', result1.status);
  assert.strictEqual(result1.status, 'SUCCEEDED', 'Dispatch on whitelist should succeed');

  // 6. Discovery Flow: Owner listens via observer
  console.log('--- Testing Discovery Flow with Observer ---');
  let interceptedRequest = null;
  const unsubscribe = ownerClient.ownerOnCapabilityState((req) => {
    console.log('Observer caught request:', req.requestId);
    interceptedRequest = req;
  });

  const unknownResult = await agentClient.agentDispatch({
    targetUrl: 'https://other-api.example.com/data',
    method: 'GET',
    secretAlias: 'top-secret',
    reason: 'Need to query the secondary API for this task.',
  });

  console.log('Result status:', unknownResult.status);
  assert.strictEqual(unknownResult.status, 'PENDING');
  assert.ok(interceptedRequest, 'Observer should have been triggered');
  unsubscribe();

  // 7. Owner lists pending capability states (to get the object for approval)
  const pending = await ownerClient.ownerListCapabilityStates({ writeGranted: false });
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(pending[0].writeGrant, null);
  assert.strictEqual(pending[0].readGrant, null);

  // 8. Owner grants the write scope, then executes and grants
  console.log('Owner executing request and granting capability...');
  const approveResult = await ownerClient.ownerAllowAlways({
    requestId: pending[0].requestId,
  });
  console.log('Approval result status:', approveResult.status);
  assert.strictEqual(approveResult.status, 'SUCCEEDED', 'Approved discovery should execute immediately');

  const granted = await ownerClient.ownerListCapabilityStates({ writeGranted: true });
  const grantedDiscovery = granted.find((record) => record.requestId === pending[0].requestId);
  assert.ok(grantedDiscovery, 'Discovery grant should remain queryable');
  assert.strictEqual(grantedDiscovery.writeGrant, 'always');
  assert.strictEqual(grantedDiscovery.readGrant, null);

  const readApproved = await ownerClient.ownerApproveCapabilityRead({
    requestId: grantedDiscovery.requestId,
  });
  assert.strictEqual(readApproved.writeGrant, 'always');
  assert.deepStrictEqual(readApproved.readGrant, []);

  // 9. Verify new capability is granted
  const finalCapabilities = await ownerClient.ownerListCapabilities({ agentId: vaultAgentId });
  console.log('Final capabilities count:', finalCapabilities.length);
  // Should have the original one + the newly granted discovery one
  assert.strictEqual(finalCapabilities.length, 2, 'Should have 2 capabilities after permanent grant');

  console.log('--- HITL Discovery & Approval Flow Test Passed ---');
}

testHitlApproval().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
