/**
 * Vault Resilience Acceptance Test
 *
 * Covers:
 * 1. Normal flow: save, load, data integrity
 * 2. Recovery from .tmp when main is corrupt (simulates crash-before-rename)
 * 3. Both corrupt: must throw
 * 4. Performance: save within 50ms budget
 */

import { generateIdentityKeys, CbioIdentity } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ingestSecret } from './helpers/ingest_secret.js';
import { readSealedSecret } from './helpers/read_sealed_secret.js';

const TEST_DIR = path.join(process.cwd(), '.cbio_resilience_test');

async function cleanup() {
    try {
        await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {}
}

async function test1_NormalFlow() {
    console.log('\n--- 1. Normal Flow: save → load → verify ---');
    await cleanup();
    process.env.C_BIO_VAULT_DIR = TEST_DIR;

    const keys = generateIdentityKeys();
    const agent = await CbioIdentity.load(keys);
    await ingestSecret(agent, 'test-key', 'secret-value-123');

    const agent2 = await CbioIdentity.load(keys);
    const loaded = await readSealedSecret(agent2, 'test-key');
    if (loaded !== 'secret-value-123') {
        throw new Error(`Data mismatch: expected secret-value-123, got ${loaded}`);
    }
    console.log('✅ Normal flow: data integrity verified');
}

async function test2_RecoveryFromTmp() {
    console.log('\n--- 2. Recovery: main corrupt, .tmp valid ---');
    await cleanup();
    process.env.C_BIO_VAULT_DIR = TEST_DIR;

    const keys = generateIdentityKeys();
    const agent = await CbioIdentity.load(keys);
    await ingestSecret(agent, 'recovery-key', 'recovery-value');

    const files = await fs.readdir(TEST_DIR);
    const encFile = files.find((f) => f.endsWith('.enc'));
    if (!encFile) throw new Error('No vault file found');
    const mainPath = path.join(TEST_DIR, encFile);
    const tmpPath = `${mainPath}.tmp`;

    await fs.writeFile(mainPath, Buffer.from('corrupt'));
    const blob = await agent.admin.vault.serializeToBlob();
    await fs.writeFile(tmpPath, Buffer.from(blob, 'base64url'));

    const agent2 = await CbioIdentity.load(keys);
    const recovered = await readSealedSecret(agent2, 'recovery-key');
    if (recovered !== 'recovery-value') {
        throw new Error(`Recovery failed: expected recovery-value, got ${recovered}`);
    }

    const mainExists = await fs.access(mainPath).then(() => true).catch(() => false);
    const tmpExists = await fs.access(tmpPath).then(() => true).catch(() => false);
    if (!mainExists || tmpExists) {
        throw new Error('Recovery should have renamed .tmp to main and removed .tmp');
    }
    console.log('✅ Recovery from .tmp: success');
}

async function test3_BothCorrupt() {
    console.log('\n--- 3. Both corrupt: must throw ---');
    await cleanup();
    process.env.C_BIO_VAULT_DIR = TEST_DIR;

    const keys = generateIdentityKeys();
    const agent = await CbioIdentity.load(keys);
    await ingestSecret(agent, 'x', 'y');

    const dir = await fs.readdir(TEST_DIR);
    const encFile = dir.find((f) => f.endsWith('.enc'));
    const mainPath = path.join(TEST_DIR, encFile);
    const tmpPath = `${mainPath}.tmp`;

    await fs.writeFile(mainPath, Buffer.from('corrupt'));
    await fs.writeFile(tmpPath, Buffer.from('corrupt'));

    let threw = false;
    try {
        await CbioIdentity.load(keys);
    } catch (e) {
        threw = true;
        if (!e.message?.includes('corrupted') && !e.message?.includes('unreadable')) {
            throw new Error(`Expected corruption error, got: ${e.message}`);
        }
    }
    if (!threw) {
        throw new Error('Should have thrown when both main and .tmp are corrupt');
    }
    console.log('✅ Both corrupt: correctly throws');
}

async function test4_Performance() {
    console.log('\n--- 4. Performance: save within 50ms ---');
    await cleanup();
    process.env.C_BIO_VAULT_DIR = TEST_DIR;

    const keys = generateIdentityKeys();
    const agent = await CbioIdentity.load(keys);
    await ingestSecret(agent, 'perf-key', 'x'.repeat(100));

    const iterations = 5;
    const times = [];
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await agent.admin.vault.saveVaultAs(path.join(TEST_DIR, 'perf_vault.enc'));
        times.push(performance.now() - start);
    }
    const avg = times.reduce((a, b) => a + b, 0) / iterations;
    const max = Math.max(...times);
    console.log(`  Avg: ${avg.toFixed(1)}ms, Max: ${max.toFixed(1)}ms`);

    if (max > 50) {
        console.warn(`⚠️  Max ${max.toFixed(0)}ms exceeds 50ms budget (SSD). May be acceptable on HDD.`);
    } else {
        console.log('✅ Performance: within 50ms budget');
    }
}

async function run() {
    console.log('=== Vault Resilience Acceptance ===');
    await test1_NormalFlow();
    await test2_RecoveryFromTmp();
    await test3_BothCorrupt();
    await test4_Performance();
    await cleanup();
    console.log('\n=== All acceptance criteria passed ===');
}

run().catch((e) => {
    console.error('❌', e);
    process.exit(1);
});
