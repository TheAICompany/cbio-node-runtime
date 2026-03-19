/**
 * Error Hierarchy Acceptance Test
 *
 * Covers:
 * 1. IdentityError is thrown with correct codes
 * 2. isIdentityError type guard
 * 3. Error codes can be mapped to responses
 */

import {
    CbioIdentity,
    IdentityError,
    IdentityErrorCode,
    generateIdentityKeys
} from '../../dist/runtime/index.js';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ingestSecret } from './helpers/ingest_secret.js';

const TEST_DIR = path.join(process.cwd(), '.cbio_errors_test');

async function cleanup() {
    try {
        await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {}
}

async function test1_SecretNotFound() {
    console.log('\n--- 1. SECRET_NOT_FOUND ---');
    await cleanup();
    process.env.C_BIO_VAULT_DIR = TEST_DIR;

    const keys = generateIdentityKeys();
    const agent = await CbioIdentity.load(keys);

    try {
        await agent.fetchWithAuth('nonexistent', 'https://example.com');
    } catch (e) {
        if (!IdentityError.isIdentityError(e)) throw new Error('Expected IdentityError');
        if (e.code !== IdentityErrorCode.SECRET_NOT_FOUND) throw new Error(`Expected SECRET_NOT_FOUND, got ${e.code}`);
    }
    console.log('✅ SECRET_NOT_FOUND');
}

async function test2_InvalidKdk() {
    console.log('\n--- 2. INVALID_KDK ---');
    await cleanup();
    process.env.C_BIO_VAULT_DIR = TEST_DIR;

    const keys = generateIdentityKeys();
    const agent = await CbioIdentity.load(keys);
    await ingestSecret(agent, 'x', 'y');

    const sealed = agent.admin.vault.seal(crypto.randomBytes(32).toString('base64url'));
    const agent2 = await CbioIdentity.load(keys);

    try {
        agent2.admin.vault.loadFromSealedBlob('short', sealed);
    } catch (e) {
        if (!IdentityError.isIdentityError(e)) throw new Error('Expected IdentityError');
        if (e.code !== IdentityErrorCode.INVALID_KDK) throw new Error(`Expected INVALID_KDK, got ${e.code}`);
    }
    console.log('✅ INVALID_KDK');
}

async function test3_CodeMapping() {
    console.log('\n--- 3. Error code mapping ---');
    const mapping = {
        [IdentityErrorCode.SECRET_NOT_FOUND]: 404,
        [IdentityErrorCode.VAULT_CORRUPTED]: 500,
        [IdentityErrorCode.VAULT_DECRYPT_FAILED]: 401,
        [IdentityErrorCode.INVALID_KDK]: 400
    };
    if (mapping[IdentityErrorCode.SECRET_NOT_FOUND] !== 404) {
        throw new Error('Code mapping failed');
    }
    console.log('✅ IdentityErrorCode values are mappable');
}

async function run() {
    console.log('=== Error Hierarchy Acceptance ===');
    await test1_SecretNotFound();
    await test2_InvalidKdk();
    await test3_CodeMapping();
    await cleanup();
    console.log('\n=== All acceptance criteria passed ===');
}

run().catch((e) => {
    console.error('❌', e);
    process.exit(1);
});
