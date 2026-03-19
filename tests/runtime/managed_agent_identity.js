import { CbioIdentity, generateIdentityKeys } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function testManagedAgentIdentity() {
    console.log('--- Managed Agent Identity Test ---');

    const DIR = path.join(process.cwd(), '.cbio_managed_agent_test_' + Date.now());
    await fs.mkdir(DIR, { recursive: true });
    process.env.C_BIO_VAULT_DIR = DIR;

    const mockBase = 'https://managed-agent-mock.local';
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
        const u = typeof url === 'string' ? url : url.toString();
        if (u.startsWith(mockBase)) {
            return new Response(JSON.stringify({ token: 'agent-only-secret' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return originalFetch(url);
    };

    try {
        const rootKeys = generateIdentityKeys();
        const rootIdentity = await CbioIdentity.load(rootKeys);
        const rootAgentId = await rootIdentity.getAgentId();

        const managed = await rootIdentity.admin.issueManagedAgent({
            agentPermissions: { 'vault:acquire': true, 'vault:fetch': true, 'vault:list': true },
        });
        const managedAgentId = await managed.agent.getAgentId();

        if (managed.agentId !== managedAgentId) {
            throw new Error(`Managed agentId mismatch: ${managed.agentId} vs ${managedAgentId}`);
        }
        if (managedAgentId === rootAgentId) {
            throw new Error('Managed agent must have its own identity, not reuse root identity.');
        }

        const acq = await managed.agent.fetchAndAddSecret({
            secretName: 'service-token',
            url: `${mockBase}/acquire`,
            extractKey: (r) => r.token || '',
            allowedOrigins: [mockBase],
        });
        if (!acq.success) throw new Error(`fetchAndAddSecret failed: ${acq.error}`);
        if (!managed.agent.hasSecret('service-token')) {
            throw new Error('Managed agent could not access its own vault.');
        }
        if (rootIdentity.hasSecret('service-token')) {
            throw new Error('Root authority should not see managed agent vault contents in its own vault.');
        }

        const stored = rootIdentity.admin.getSecret(managed.secretName);
        if (!stored) {
            throw new Error('Root authority did not persist managed agent identity record.');
        }
        const parsed = JSON.parse(stored);
        if (parsed.agentId !== managed.agentId || parsed.publicKey !== managed.publicKey || !parsed.issuedIdentity) {
            throw new Error('Managed agent identity record is incomplete (missing protocol fields).');
        }

        if (parsed.issuedIdentity.cbio_protocol !== 'v1.0' || parsed.issuedIdentity.kind !== 'issued_agent_identity') {
            throw new Error('Managed agent identity record has invalid protocol version or kind.');
        }

        if (parsed.issuedIdentity.agent.agent_id !== managed.agentId) {
            throw new Error('Issued identity agent_id mismatch.');
        }

        const reloaded = await rootIdentity.admin.loadManagedAgent(managed.publicKey);
        if (!reloaded.agent.hasSecret('service-token')) {
            throw new Error('Reloaded managed agent did not recover its own vault.');
        }

        console.log('✅ managed agent identity: independent identity, independent vault, root-governed recovery');
    } finally {
        global.fetch = originalFetch;
        await fs.rm(DIR, { recursive: true, force: true });
    }
}

testManagedAgentIdentity().catch((error) => {
    console.error('❌ Managed agent identity test failed:', error);
    process.exit(1);
});

