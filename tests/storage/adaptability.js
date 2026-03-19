import {
    CbioIdentity,
    generateIdentityKeys,
    FsStorageProvider,
    MemoryStorageProvider,
} from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function testStorageAdaptability() {
    console.log('=== Storage Adaptability Acceptance ===');

    const TEST_DIR = path.join(process.cwd(), '.cbio_storage_test_' + Date.now());
    await fs.mkdir(TEST_DIR, { recursive: true });

    try {
        const keys = generateIdentityKeys();

        console.log('\n--- 1. Default FsStorageProvider ---');
        process.env.C_BIO_VAULT_DIR = TEST_DIR;
        const agent = await CbioIdentity.load(keys);
        await agent.admin.addSecret('fs-key', 'fs-val');

        const agent2 = await CbioIdentity.load(keys);
        if (agent2.admin.getSecret('fs-key') === 'fs-val') {
            console.log('✅ Default fs storage');
        } else {
            throw new Error('FsStorageProvider failed');
        }

        console.log('\n--- 2. Custom MemoryStorageProvider ---');
        const storage = new MemoryStorageProvider();
        const agent3 = await CbioIdentity.load(keys, {
            storage,
            storageKey: 'mem-vault.enc',
        });
        await agent3.admin.addSecret('mem-key', 'mem-val');

        const agent4 = await CbioIdentity.load(keys, {
            storage,
            storageKey: 'mem-vault.enc',
        });
        if (agent4.admin.getSecret('mem-key') === 'mem-val') {
            console.log('✅ Custom memory storage');
        } else {
            throw new Error('MemoryStorageProvider failed');
        }

        console.log('\n--- 3. Vault save/load with explicit storage ---');
        const storageKey = 'explicit.enc';
        const agent5 = await CbioIdentity.load(keys, { storage, storageKey });
        await agent5.admin.addSecret('exp-key', 'exp-val');

        const agent6 = await CbioIdentity.load(keys, { storage, storageKey });
        if (agent6.admin.getSecret('exp-key') === 'exp-val') {
            console.log('✅ Explicit storage save/load');
        } else {
            throw new Error('Explicit storage failed');
        }

        console.log('\n=== All acceptance criteria passed ===');
    } finally {
        await fs.rm(TEST_DIR, { recursive: true, force: true });
    }
}

testStorageAdaptability().catch((e) => {
    console.error('❌', e);
    process.exit(1);
});
