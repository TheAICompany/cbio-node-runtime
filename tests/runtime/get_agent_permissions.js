import { CbioIdentity, generateIdentityKeys } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
 
async function run() {
    const dir = path.join(process.cwd(), '.cbio_get_agent_test_' + Date.now());
    await fs.mkdir(dir, { recursive: true });
    process.env.C_BIO_VAULT_DIR = dir;

    try {
        const rootKeys = generateIdentityKeys();
        const rootIdentity = await CbioIdentity.load(rootKeys);

        const defaultAgent = rootIdentity.getAgent();
        if (!defaultAgent.can('vault:fetch') || !defaultAgent.can('vault:list')) {
            throw new Error('Default agent should keep minimal fetch/list permissions.');
        }
        if (defaultAgent.can('vault:acquire')) {
            throw new Error('Default agent should not implicitly gain acquire permission.');
        }

        const managed = await rootIdentity.admin.managedAgents.issueManagedAgent({
            issue: {
                issuedCapabilities: ['vault:acquire'],
            },
        });

        const minimalManagedAgent = await rootIdentity.admin.managedAgents.loadManagedAgent(managed.publicKey);
        if (minimalManagedAgent.agent.can('vault:acquire')) {
            throw new Error('getAgent() should not auto-derive runtime permissions by default.');
        }

        console.log('✅ getAgent permissions: default minimal, no implicit runtime widening');
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
}

run().catch((error) => {
    console.error('❌ getAgent permissions test failed:', error);
    process.exit(1);
});
