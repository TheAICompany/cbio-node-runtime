import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CbioIdentity, generateIdentityKeys } from '../../dist/runtime/index.js';

async function run() {
    const testDir = path.join(process.cwd(), '.cbio_rotation_policy_test');
    process.env.C_BIO_VAULT_DIR = testDir;
    await fs.rm(testDir, { recursive: true, force: true });

    const originalFetch = global.fetch;
    try {
        const keys = generateIdentityKeys();
        const agent = await CbioIdentity.load(keys);

        let issuedValue = 'rotated-secret-v2';
        global.fetch = async (url) => {
            const origin = new URL(url).origin;
            return {
                ok: true,
                async json() {
                    return {
                        token: issuedValue,
                        origin,
                    };
                },
                headers: new Headers(),
            };
        };

        await agent.admin.addSecret('service-a', 'initial-secret', {
            allowedOrigins: ['https://issuer-a.example.com'],
        });

        const rotated = await agent.fetchAndUpdateSecret({
            secretName: 'service-a',
            url: 'https://issuer-a.example.com/rotate',
            extractKey: (response) => response.token,
        });

        assert.equal(rotated.success, true, rotated.error);
        assert.equal(agent.admin.getSecret('service-a'), 'rotated-secret-v2');

        issuedValue = 'attacker-secret';
        const rejected = await agent.fetchAndUpdateSecret({
            secretName: 'service-a',
            url: 'https://issuer-b.example.com/rotate',
            extractKey: (response) => response.token,
        });

        assert.equal(rejected.success, false, 'Rotation from a different origin should be rejected');
        assert.match(rejected.error ?? '', /only allows rotation from/i);
        assert.equal(agent.admin.getSecret('service-a'), 'rotated-secret-v2', 'Rejected rotation must not replace the active key');

        console.log('✅ Secret rotation origin policy test passed');
    } finally {
        global.fetch = originalFetch;
        await fs.rm(testDir, { recursive: true, force: true });
    }
}

run().catch((error) => {
    console.error('❌ Secret rotation origin policy test failed:', error);
    process.exit(1);
});
