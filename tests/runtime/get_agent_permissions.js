import { CbioIdentity, generateIdentityKeys } from '../../dist/runtime/index.js';
import { getChildIdentitySecretName } from '../../dist/protocol/identity.js';
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

        const stored = rootIdentity.admin.vault.getSecret(getChildIdentitySecretName(managed.publicKey));
        if (!stored) {
            throw new Error('Managed identity record not found.');
        }
        const parsed = JSON.parse(stored);
        const managedIdentity = await CbioIdentity.load({
            privateKey: parsed.privateKey,
            publicKey: parsed.publicKey,
        });
        managedIdentity.setIssuedIdentity(parsed.issuedIdentity);

        const derivedAgent = managedIdentity.getAgent({ deriveFromIssuedIdentity: true });
        if (!derivedAgent.can('vault:acquire')) {
            throw new Error('Explicit derivation from issued identity should grant issued runtime permissions.');
        }

        console.log('✅ getAgent permissions: default minimal, derivation explicit');
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
}

run().catch((error) => {
    console.error('❌ getAgent permissions test failed:', error);
    process.exit(1);
});
