import { generateIdentityKeys, CbioIdentity } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function testAutoSave() {
    process.env.C_BIO_VAULT_DIR = path.join(process.cwd(), '.cbio_test');

    try { await fs.rm(process.env.C_BIO_VAULT_DIR, { recursive: true, force: true }); } catch(e) {}

    console.log("--- 1. Initializing Agent A (CbioAgent.load) ---");
    const keysA = generateIdentityKeys();
    const agentA = await CbioIdentity.load(keysA);
    const originalFetch = global.fetch;
    global.fetch = async (_url, options = {}) => {
        const body = options.body ? JSON.parse(options.body) : {};
        return new Response(JSON.stringify({ json: body }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    };

    try {
        console.log("--- 2. Agent A acquiring credentials (NO MANUAL SAVE) ---");
        const result = await agentA.fetchAndAddSecret({
            secretName: 'auto-key',
            url: 'https://mocked-httpbin.local/post',
            method: 'POST',
            body: { token: 'auto-save-secret' },
            extractKey: (json) => json.json.token
        });

        if (result.success) {
            console.log("✅ SDK says: Secret acquired.");
        } else {
            throw new Error("Acquisition failed: " + result.error);
        }

        console.log("--- 3. Simulate process exit/restart ---");
        const agentRecovery = await CbioIdentity.load(keysA);
        // agentRecovery should automatically have the same vault path derived from keysA

        console.log(`Checking vault content...`);
        const hasSecret = agentRecovery.hasSecret('auto-key');

        if (hasSecret) {
            console.log("✅ SUCCESS: The secret was automatically saved and recovered!");
        } else {
            throw new Error("❌ FAILURE: The secret was lost. Auto-persistence failed.");
        }
    } finally {
        global.fetch = originalFetch;
        const vaultDir = process.env.C_BIO_VAULT_DIR;
        await fs.rm(vaultDir, { recursive: true, force: true });
    }
}

testAutoSave().catch(e => {
    console.error("❌ AutoSave Test Failed:", e);
    process.exit(1);
});
