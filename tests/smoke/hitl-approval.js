import { createVault, createVaultClient, createAgentClient, MemoryStorageProvider } from '../../dist/runtime/index.js';
import assert from 'node:assert';

async function testHitlApproval() {
  console.log('--- Testing HITL Approval Flow ---');

  // 1. Setup Vault and Clients
  const { vault } = await createVault(new MemoryStorageProvider(), {
    vaultId: 'vault-hitl-test',
    nickname: 'HITL Test Vault',
    password: 'hitl-test-password',
  });

  const ownerClient = createVaultClient({
    vault,
    ownerIdentity: { identityId: 'owner-1' }
  });

  // 2. Create and Register Agent
  const provisionedAgent = await ownerClient.ownerCreateAgent({
    agentId: 'agent-1'
  });

  // 3. Register a Secret
  await ownerClient.ownerWriteSecret({
    alias: 'top-secret',
    plaintext: 'shhh!',
    targetBindings: [{ kind: 'site', targetId: 'mock-api', targetUrl: 'https://api.example.com/*' }]
  });

  // 4. Grant Capability (NO LONGER REQUIRES EXPLICIT FLAG)
  await ownerClient.ownerGrantCapability({
    agentId: 'agent-1',
    secretAliases: ['top-secret'],
    scope: 'https://api.example.com/*',
    methods: ['POST'],
    // requiresApproval: true removed
  });

  const capabilities = await ownerClient.ownerListCapabilities({ agentId: 'agent-1' });
  const agentClient = createAgentClient({
    agentIdentity: { agentId: 'agent-1' },
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
    body: 'ping'
  });

  console.log('Result status:', result1.status);
  assert.strictEqual(result1.status, 'SUCCEEDED', 'Dispatch on whitelist should succeed');

  // 6. Discovery Flow: Owner listens via observer
  console.log('--- Testing Discovery Flow with Observer ---');
  let interceptedRequest = null;
  const unsubscribe = ownerClient.ownerOnPendingDispatch((req) => {
    console.log('Observer caught request:', req.requestId);
    interceptedRequest = req;
  });

  const unknownResult = await agentClient.agentDispatch({
    targetUrl: 'https://other-api.example.com/data',
    method: 'GET',
    secretAlias: 'top-secret',
  });

  console.log('Result status:', unknownResult.status);
  assert.strictEqual(unknownResult.status, 'PENDING');
  assert.ok(interceptedRequest, 'Observer should have been triggered');
  unsubscribe();

  // 7. Owner lists pending requests (to get the object for approval)
  const pending = await ownerClient.ownerListPendingDispatches();
  assert.strictEqual(pending.length, 1);

  // 8. Owner approves and makes it PERMANENT
  console.log('Owner approving and granting permanent capability...');
  const approveResult = await ownerClient.ownerApproveDispatch({
    requestId: pending[0].requestId,
    permanent: true
  });
  
  console.log('Approve result status:', approveResult.status);
  assert.strictEqual(approveResult.status, 'SUCCEEDED', 'Approved discovery should succeed');

  // 9. Verify new capability is granted
  const finalCapabilities = await ownerClient.ownerListCapabilities({ agentId: 'agent-1' });
  console.log('Final capabilities count:', finalCapabilities.length);
  // Should have the original one + the newly granted discovery one
  assert.strictEqual(finalCapabilities.length, 2, 'Should have 2 capabilities after permanent grant');

  console.log('--- HITL Discovery & Approval Flow Test Passed ---');
}

testHitlApproval().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
