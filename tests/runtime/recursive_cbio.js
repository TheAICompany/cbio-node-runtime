import { CbioIdentity, generateIdentityKeys } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function verifyRecursiveCbio() {
    console.log("--- Recursive Cbio Hierarchy Proof ---");

    const TEST_DIR = path.join(process.cwd(), '.cbio_recursive_test_' + Date.now());
    await fs.mkdir(TEST_DIR, { recursive: true });
    process.env.C_BIO_VAULT_DIR = TEST_DIR;

    try {
        const keysA = generateIdentityKeys();
        const agentA = await CbioIdentity.load(keysA);
        console.log("-> Root Identity A initialized.");

        const keysB = generateIdentityKeys();
        await agentA.admin.vault.addSecret('cbioAgent-b-priv', keysB.privateKey);
        console.log("-> Identity B keys stored in A's vault.");

        const agentB = await CbioIdentity.load(keysB);
        console.log("-> Identity B started.");

        const keysC = generateIdentityKeys();
        await agentB.admin.vault.addSecret('cbioAgent-c-priv', keysC.privateKey);
        console.log("-> Identity B initialized Identity C.");

        if (agentB.hasSecret('cbioAgent-c-priv')) {
            console.log("✅ SUCCESS: Identity B is an Agent to A, but successfully acted as Owner to C.");
        } else {
            throw new Error("Identity B failed to act as Owner to C.");
        }

    } finally {
        await fs.rm(TEST_DIR, { recursive: true, force: true });
        console.log("--- Recursive Proof Finished ---");
    }
}

verifyRecursiveCbio().catch((error) => {
    console.error("❌ Recursive hierarchy test failed:", error);
    process.exit(1);
});

