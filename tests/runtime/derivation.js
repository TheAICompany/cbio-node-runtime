import { CbioIdentity, generateIdentityKeys } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function verifyDerivation() {
    console.log("--- PublicKey Derivation & Vault Access Test ---");

    const fullKeys = generateIdentityKeys();
    const TEST_DIR = path.join(process.cwd(), '.cbio_derivation_test');
    await fs.mkdir(TEST_DIR, { recursive: true });

    const storageKey = path.join(TEST_DIR, 'test_vault.enc');

    const agentSave = await CbioIdentity.load(fullKeys, { storageKey });
    await agentSave.admin.addSecret('test-key', 'secret-content');
    console.log("✅ Step 1: Secret saved using full KeyPair (via agent.admin).");

    const partialKeys = { privateKey: fullKeys.privateKey };

    console.log("--- Attempting to load using ONLY PrivateKey ---");
    const agentLoad = await CbioIdentity.load(partialKeys, { storageKey });

    const derivedPub = await agentLoad.getPublicKey();
    if (derivedPub === fullKeys.publicKey) {
        console.log("✅ Step 2: PublicKey successfully derived from PrivateKey (via agent.load).");
    } else {
        throw new Error(`❌ FAILURE: Derived PublicID mismatch! Expected ${fullKeys.publicKey}, got ${derivedPub}`);
    }

    if (agentLoad.hasSecret('test-key')) {
        console.log("✅ Step 3: Vault successfully decrypted and data recovered using derived key.");
    } else {
        throw new Error("❌ FAILURE: Vault appeared empty after loading with derived key.");
    }

    await fs.rm(TEST_DIR, { recursive: true, force: true });
    console.log("--- Test Finished Successfully ---");
}

verifyDerivation().catch((error) => {
    console.error("❌ Derivation test failed:", error);
    process.exit(1);
});
