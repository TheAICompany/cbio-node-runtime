import { CbioIdentity, generateIdentityKeys, IdentityError, IdentityErrorCode } from '../../dist/runtime/index.js';
import { unsealBlob } from '../../dist/sealed/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { ingestSecret } from './helpers/ingest_secret.js';
import { readSealedSecret } from './helpers/read_sealed_secret.js';

async function verifyMergeSecurityLocal() {
    console.log("--- Merge Security Test (Local Simulation) ---");

    const LOCAL_TEST_DIR = path.join(process.cwd(), '.cbio_merge_test_' + Date.now());
    await fs.mkdir(LOCAL_TEST_DIR, { recursive: true });
    process.env.C_BIO_VAULT_DIR = LOCAL_TEST_DIR;
    const originalFetch = global.fetch;

    const storageKeyA = path.join(LOCAL_TEST_DIR, 'vault_a.enc');
    const storageKeyA2 = path.join(LOCAL_TEST_DIR, 'vault_a2.enc');
    const rotateBase = 'https://issuer-a.example.com';

    try {
        global.fetch = async (url, init) => {
            const requestUrl = typeof url === 'string' ? url : url.toString();
            if (requestUrl === `${rotateBase}/rotate`) {
                return new Response(JSON.stringify({ token: 'rotated-value-a2' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            return originalFetch(url, init);
        };

        const keysA = generateIdentityKeys();
        const agentA = await CbioIdentity.load(keysA, { storageKey: storageKeyA });
        await ingestSecret(agentA, 'secret-a', 'value-a');

        const keysB = generateIdentityKeys();
        const agentB = await CbioIdentity.load(keysB, { storageKey: path.join(LOCAL_TEST_DIR, 'vault_b.enc') });
        await ingestSecret(agentB, 'secret-b', 'value-b');

        console.log("--- 1. Attempting cross-identity merge (A <- B) ---");
        try {
            await agentA.admin.vault.mergeFrom(agentB);
            throw new Error("❌ FAILURE: Merged vaults from different identities! Security breach.");
        } catch (e) {
            if (IdentityError.isIdentityError(e) && e.code === IdentityErrorCode.MERGE_IDENTITY_MISMATCH) {
                console.log("✅ SUCCESS: SDK correctly rejected cross-identity merge.");
            } else {
                throw e;
            }
        }

        console.log("--- 2. Attempting legitimate merge (A <- A') ---");
        const agentA2 = await CbioIdentity.load(keysA, { storageKey: storageKeyA2 });
        await ingestSecret(agentA2, 'secret-a2', 'value-a2');
        await ingestSecret(agentA2, 'secret-meta', 'value-meta-v1', { allowedOrigins: [rotateBase] });
        const rotated = await agentA2.fetchJsonAndUpdateSecret({
            secretName: 'secret-meta',
            url: `${rotateBase}/rotate`,
            extractKey: (response) => response.token,
        });
        if (!rotated.success) {
            throw new Error(`Rotation before merge failed: ${rotated.error}`);
        }

        const result = await agentA.admin.vault.mergeFrom(agentA2);
        if (!result.merged) throw new Error(`Merge failed with conflicts: ${result.conflicts}`);
        if (!result.added.includes('secret-a2') || !result.added.includes('secret-meta') || result.skipped.length !== 0 || result.overwritten.length !== 0) {
            throw new Error(`Expected merge result to report added=['secret-a2'], got ${JSON.stringify(result)}`);
        }
        if (agentA.hasSecret('secret-a2') && agentA.hasSecret('secret-meta')) {
            console.log("✅ SUCCESS: Legitimate merge allowed for same identity.");
        } else {
            throw new Error("❌ FAILURE: Legitimate merge failed to sync data.");
        }

        const kdk = crypto.randomBytes(32).toString('base64url');
        const mergedPayload = unsealBlob(agentA.admin.vault.seal(kdk), kdk);
        const mergedMeta = mergedPayload.secretMetadata?.['secret-meta'];
        if (!mergedMeta || typeof mergedMeta !== 'object') {
            throw new Error(`❌ FAILURE: Expected merged secret metadata for 'secret-meta', got ${JSON.stringify(mergedMeta)}`);
        }
        if (mergedMeta.activeVersion !== 'v2') {
            throw new Error(`❌ FAILURE: Expected activeVersion v2 after merge, got ${JSON.stringify(mergedMeta)}`);
        }
        if (!mergedMeta.versions?.v1 || !mergedMeta.versions?.v2) {
            throw new Error(`❌ FAILURE: Expected full version chain after merge, got ${JSON.stringify(mergedMeta)}`);
        }
        if (mergedMeta.versions.v2.sourceOrigin !== rotateBase) {
            throw new Error(`❌ FAILURE: Expected merged sourceOrigin ${rotateBase}, got ${JSON.stringify(mergedMeta.versions.v2)}`);
        }
        console.log("✅ SUCCESS: Merge preserved version history and source provenance.");

        console.log("--- 3. Conflict handling: merge without force returns conflicts ---");
        const agentA3 = await CbioIdentity.load(keysA, { storageKey: path.join(LOCAL_TEST_DIR, 'vault_a3.enc') });
        await ingestSecret(agentA3, 'secret-a', 'value-a-DIFFERENT');
        const conflictResult = await agentA.admin.vault.mergeFrom(agentA3);
        if (
            !conflictResult.merged &&
            conflictResult.conflicts?.includes('secret-a') &&
            conflictResult.added.length === 0 &&
            conflictResult.skipped.length === 0 &&
            conflictResult.overwritten.length === 0
        ) {
            console.log("✅ SUCCESS: Conflicts reported, merge aborted.");
        } else {
            throw new Error(`❌ FAILURE: Expected conflicts, got ${JSON.stringify(conflictResult)}`);
        }

        console.log("--- 4. Force merge: receiver wins ---");
        const forceResult = await agentA.admin.vault.mergeFrom(agentA3, { onConflict: 'skip' });
        if (!forceResult.merged) throw new Error(`Force merge failed: ${JSON.stringify(forceResult)}`);
        if (!forceResult.skipped.includes('secret-a') || forceResult.added.length !== 0 || forceResult.overwritten.length !== 0) {
            throw new Error(`❌ FAILURE: Expected skip result for 'secret-a', got ${JSON.stringify(forceResult)}`);
        }
        const kept = await readSealedSecret(agentA, 'secret-a');
        if (kept === 'value-a') {
            console.log("✅ SUCCESS: Receiver value kept on force merge.");
        } else {
            throw new Error(`❌ FAILURE: Expected 'value-a', got '${kept}'`);
        }

        console.log("--- 5. Overwrite merge: sender wins and result reports overwrite ---");
        const overwriteResult = await agentA.admin.vault.mergeFrom(agentA3, { onConflict: 'overwrite' });
        if (!overwriteResult.merged) throw new Error(`Overwrite merge failed: ${JSON.stringify(overwriteResult)}`);
        if (!overwriteResult.overwritten.includes('secret-a') || overwriteResult.added.length !== 0) {
            throw new Error(`❌ FAILURE: Expected overwrite result for 'secret-a', got ${JSON.stringify(overwriteResult)}`);
        }
        const replaced = await readSealedSecret(agentA, 'secret-a');
        if (replaced === 'value-a-DIFFERENT') {
            console.log("✅ SUCCESS: Sender value applied on overwrite merge.");
        } else {
            throw new Error(`❌ FAILURE: Expected 'value-a-DIFFERENT', got '${replaced}'`);
        }

    } catch (e) {
        console.error("❌ Test logic error:", e);
        throw e;
    } finally {
        global.fetch = originalFetch;
        try {
            await fs.rm(LOCAL_TEST_DIR, { recursive: true, force: true });
        } catch (cleanupError) {
            // Quiet cleanup failure
        }
    }
}

verifyMergeSecurityLocal().catch(e => {
    console.error("❌ Merge Security Test Failed:", e);
    process.exit(1);
});
