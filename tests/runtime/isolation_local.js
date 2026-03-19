import { CbioIdentity, generateIdentityKeys } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

async function verifyIsolationLocal() {
    console.log("--- Identity Isolation Test (Local Simulation) ---");

    const LOCAL_TEST_DIR = path.join(process.cwd(), '.cbio_test_isolation');
    await fs.mkdir(LOCAL_TEST_DIR, { recursive: true });

    function getLocalVaultPath(publicKey) {
        const hash = crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 12);
        return path.join(LOCAL_TEST_DIR, `vault_${hash}.enc`);
    }

    const keysA = generateIdentityKeys();
    const pathA = getLocalVaultPath(keysA.publicKey);

    const keysB = generateIdentityKeys();
    const pathB = getLocalVaultPath(keysB.publicKey);

    console.log(`Path A: ${path.basename(pathA)}`);
    console.log(`Path B: ${path.basename(pathB)}`);

    if (pathA === pathB) {
        throw new Error("❌ FAILURE: Paths are identical! Isolation failed.");
    }

    console.log("--- 1. Agent A registers a secret ---");
    const agentA = await CbioIdentity.load(keysA, { storageKey: pathA });
    await agentA.admin.vault.addSecret('secret-a', 'value-a');

    console.log("--- 2. Agent B registers a secret ---");
    const agentB = await CbioIdentity.load(keysB, { storageKey: pathB });
    await agentB.admin.vault.addSecret('secret-b', 'value-b');

    console.log("--- 3. Verifying files exist separately ---");
    await fs.stat(pathA);
    await fs.stat(pathB);
    console.log(`✅ Verified: Both vault files created independently.`);

    console.log("--- 4. Verifying content isolation ---");
    const agentAReload = await CbioIdentity.load(keysA, { storageKey: pathA });
    if (agentAReload.hasSecret('secret-a') && !agentAReload.hasSecret('secret-b')) {
        console.log("✅ SUCCESS: Dynamic naming ensures no cross-contamination!");
    } else {
         throw new Error("Data cross-contamination detected.");
    }

    await fs.rm(LOCAL_TEST_DIR, { recursive: true, force: true });
}

verifyIsolationLocal().catch((error) => {
    console.error("❌ Isolation test failed:", error);
    process.exit(1);
});
