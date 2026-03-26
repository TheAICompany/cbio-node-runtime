import { createVault, createVaultClient, createAgentClient } from '../../dist/runtime/index.js';
import assert from 'node:assert';

async function testHitlApproval() {
  console.log('--- Testing HITL Approval Flow ---');

  // 1. Setup Vault and Clients
  const { vault, workingKey } = await createVault({
    name: 'HITL Test Vault'
  });

  const ownerClient = createVaultClient({
    vault,
    ownerIdentity: { identityId: 'owner-1' }
  });

  // 2. Create and Register Agent
  const [agentRecord, privateKey] = await ownerClient.createAgent({
    agentId: 'agent-1'
  });

  // 3. Register a Secret
  await ownerClient.writeSecret({
    alias: 'top-secret',
    plaintext: 'shhh!',
    targetBindings: [{ kind: 'site', targetId: 'mock-api', targetUrl: 'https://api.example.com/*' }]
  });

  // 4. Grant Capability with REQUIRES APPROVAL
  await ownerClient.grantCapability({
    agentId: 'agent-1',
    secretAliases: ['top-secret'],
    allowedTargets: ['https://api.example.com/*'],
    requiresApproval: true // THIS IS THE KEY
  });

  const capabilities = await ownerClient.listCapabilities({ agentId: 'agent-1' });
  const agentClient = createAgentClient({
    agentIdentity: { agentId: 'agent-1', privateKey },
    capability: capabilities[0],
    vault
  });

  // 5. Agent attempts dispatch -> Should be PENDING
  console.log('Agent dispatching request (requires approval)...');
  const result1 = await agentClient.dispatch({
    targetUrl: 'https://api.example.com/data',
    method: 'POST',
    secretAlias: 'top-secret',
    body: 'ping'
  });

  console.log('Result status:', result1.status);
  assert.strictEqual(result1.status, 'PENDING', 'Dispatch should be pending');

  // 6. Owner lists pending requests
  const pending = await ownerClient.listPendingDispatches();
  console.log('Pending requests found:', pending.length);
  assert.strictEqual(pending.length, 1, 'Should have 1 pending request');
  assert.strictEqual(pending[0].agentId, 'agent-1');
  assert.strictEqual(pending[0].secretAlias, 'top-secret');

  // 7. Owner approves the request
  console.log('Owner approving request:', pending[0].requestId);
  const result2 = await ownerClient.approveDispatch(pending[0].requestId);
  
  console.log('Approved dispatch status:', result2.status);
  // Note: in a real environment this would actualy perform the fetch. 
  // In a smoke test with default mocks, it might succeed or fail depending on fetch mock.
  
  // 8. Verify request is no longer pending
  const pendingAfter = await ownerClient.listPendingDispatches();
  assert.strictEqual(pendingAfter.length, 0, 'Should have 0 pending requests after approval');

  console.log('--- HITL Approval Flow Test Passed ---');
}

testHitlApproval().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
