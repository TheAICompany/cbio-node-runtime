import { CbioIdentity, generateIdentityKeys } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function verifyHardenedSecurity() {
    console.log("--- Production-Grade Security Hardening Test (Dual Gateway) ---");

    const LOCAL_VAULT_DIR = path.join(process.cwd(), '.cbio_hardened_test');
    await fs.mkdir(LOCAL_VAULT_DIR, { recursive: true });
    process.env.C_BIO_VAULT_DIR = LOCAL_VAULT_DIR;

    const keys = generateIdentityKeys();

    const agent = await CbioIdentity.load(keys);
    console.log("1. Identity (Agent) initialized.");

    const originalFetch = global.fetch;
    global.fetch = async (_url, options = {}) => {
        const body = options.body ? JSON.parse(options.body) : {};
        return new Response(JSON.stringify({ json: body }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    };

    try {
        console.log("\n[Test 1] fetchJsonAndAddSecret & Auto-Sanitization");
        const secretValue = "super_secret_token_12345";

        const result = await agent.fetchJsonAndAddSecret({
            secretName: 'test-service',
            url: 'https://mocked-httpbin.local/post',
            method: 'POST',
            body: {
                token: secretValue,
                metadata: "visible_info",
                nested: { my_key: secretValue }
            },
            extractKey: (res) => res.json.token
        });

        if (!result.success) {
            throw new Error(`fetchJsonAndAddSecret failed: ${result.error}`);
        }

        console.log("✅ Secret acquired and locked.");
        const echoedData = result.data.json;
        console.log("   Checking data leak prevention in returned JSON...");
        if (echoedData.token === '***' && echoedData.nested.my_key === '***') {
            console.log("   ✅ SUCCESS: Secret was automatically masked in the response data!");
        } else {
            throw new Error(`Secret leaked in result.data: ${JSON.stringify(echoedData)}`);
        }

        console.log("\n[Test 2] Entry point restriction");
        if ((agent).getSecret === undefined && (agent).deleteSecret === undefined) {
            console.log("✅ SUCCESS: CbioAgent is physically blocked from direct admin methods.");
        } else {
            throw new Error("Admin methods leaked to CbioAgent surface.");
        }

        console.log("\n[Test 3] getSecret via Admin Facet");
        const recovered = agent.admin.vault.getSecret('test-service');
        if (recovered === secretValue) {
            console.log("✅ SUCCESS: Owner can recover secrets via Admin Facet.");
        } else {
            throw new Error("Secret recovery failed.");
        }

        console.log("\n[Test 4] deleteSecret via Admin Facet");
        await agent.admin.vault.deleteSecret('test-service');

        const agentRestart = await CbioIdentity.load(keys);
        if (agentRestart.hasSecret('test-service')) {
            throw new Error("Secret persisted after deletion.");
        } else {
            console.log("✅ SUCCESS: Secret removed from disk (Verified via restart).");
        }
    } finally {
        global.fetch = originalFetch;
    }

    await fs.rm(LOCAL_VAULT_DIR, { recursive: true, force: true });
    console.log("\n--- Hardening Test Finished ---");
}

verifyHardenedSecurity().catch((error) => {
    console.error("❌ Hardened vault test failed:", error);
    process.exit(1);
});
