import { CbioIdentity, generateIdentityKeys, IdentityError, IdentityErrorCode } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function verifyMergeSecurityLocal() {
    console.log("--- Merge Security Test (Local Simulation) ---");

    const LOCAL_TEST_DIR = path.join(process.cwd(), '.cbio_merge_test_' + Date.now());
    await fs.mkdir(LOCAL_TEST_DIR, { recursive: true });
    process.env.C_BIO_VAULT_DIR = LOCAL_TEST_DIR;

    const storageKeyA = path.join(LOCAL_TEST_DIR, 'vault_a.enc');
    const storageKeyA2 = path.join(LOCAL_TEST_DIR, 'vault_a2.enc');

    try {
        const keysA = generateIdentityKeys();
        const agentA = await CbioIdentity.load(keysA, { storageKey: storageKeyA });
        await agentA.admin.addSecret('secret-a', 'value-a');

        const keysB = generateIdentityKeys();
        const agentB = await CbioIdentity.load(keysB, { storageKey: path.join(LOCAL_TEST_DIR, 'vault_b.enc') });
        await agentB.admin.addSecret('secret-b', 'value-b');

        console.log("--- 1. Attempting cross-identity merge (A <- B) ---");
        try {
            await agentA.admin.mergeFrom(agentB);
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
        await agentA2.admin.addSecret('secret-a2', 'value-a2');

        const result = await agentA.admin.mergeFrom(agentA2);
        if (!result.merged) throw new Error(`Merge failed with conflicts: ${result.conflicts}`);
        if (agentA.hasSecret('secret-a2')) {
            console.log("✅ SUCCESS: Legitimate merge allowed for same identity.");
        } else {
            throw new Error("❌ FAILURE: Legitimate merge failed to sync data.");
        }

        console.log("--- 3. Conflict handling: merge without force returns conflicts ---");
        const agentA3 = await CbioIdentity.load(keysA, { storageKey: path.join(LOCAL_TEST_DIR, 'vault_a3.enc') });
        await agentA3.admin.addSecret('secret-a', 'value-a-DIFFERENT');
        const conflictResult = await agentA.admin.mergeFrom(agentA3);
        if (!conflictResult.merged && conflictResult.conflicts?.includes('secret-a')) {
            console.log("✅ SUCCESS: Conflicts reported, merge aborted.");
        } else {
            throw new Error(`❌ FAILURE: Expected conflicts, got ${JSON.stringify(conflictResult)}`);
        }

        console.log("--- 4. Force merge: receiver wins ---");
        const forceResult = await agentA.admin.mergeFrom(agentA3, { onConflict: 'skip' });
        if (!forceResult.merged) throw new Error(`Force merge failed: ${JSON.stringify(forceResult)}`);
        const kept = agentA.admin.getSecret('secret-a');
        if (kept === 'value-a') {
            console.log("✅ SUCCESS: Receiver value kept on force merge.");
        } else {
            throw new Error(`❌ FAILURE: Expected 'value-a', got '${kept}'`);
        }

    } catch (e) {
        console.error("❌ Test logic error:", e);
        throw e;
    } finally {
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
