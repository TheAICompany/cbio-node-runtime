import { CbioIdentity, generateIdentityKeys } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as http from 'node:http';

async function verifyHardenedSecurity() {
    console.log("--- Production-Grade Security Hardening Test (Dual Gateway) ---");

    const LOCAL_VAULT_DIR = path.join(process.cwd(), '.cbio_hardened_test');
    await fs.mkdir(LOCAL_VAULT_DIR, { recursive: true });
    process.env.C_BIO_VAULT_DIR = LOCAL_VAULT_DIR;

    const keys = generateIdentityKeys();

    const agent = await CbioIdentity.load(keys);
    console.log("1. Identity (Agent) initialized.");

    const originalFetch = global.fetch;
    global.fetch = async (url, options = {}) => {
        const requestUrl = typeof url === 'string' ? url : url.toString();
        if (requestUrl === 'https://mocked-httpbin.local/post') {
            const body = options.body ? JSON.parse(options.body) : {};
            return new Response(JSON.stringify({ json: body }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return originalFetch(url, options);
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

        console.log("\n[Test 3] vault-backed auth path uses secret without exposing it");
        const upstream = http.createServer((req, res) => {
            const auth = req.headers.authorization ?? '';
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ auth }));
        });
        let port;
        try {
            port = await new Promise((resolve, reject) => {
                upstream.once('error', reject);
                upstream.listen(0, '127.0.0.1', () => {
                    upstream.off('error', reject);
                    resolve(upstream.address().port);
                });
            });
        } catch (error) {
            if (error && error.code === 'EPERM') {
                console.log("ℹ️ Skipping loopback auth-path verification: local listen is not permitted in this environment");
                port = null;
            } else {
                throw error;
            }
        }
        try {
            if (port != null) {
                const response = await agent.fetchWithAuth('test-service', `http://127.0.0.1:${port}/`);
                const json = await response.json();
                if (json.auth === `Bearer ${secretValue}`) {
                    console.log("✅ SUCCESS: Secret stays inside vault/auth path and is usable without plaintext recovery.");
                } else {
                    throw new Error("Vault-backed auth did not inject the stored secret.");
                }
            }
        } finally {
            if (port != null) {
                await new Promise((resolve) => upstream.close(resolve));
            }
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
