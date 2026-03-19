import assert from "node:assert";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { CbioIdentity, IdentityError, IdentityErrorCode, generateIdentityKeys } from "../../dist/runtime/index.js";

async function run() {
    const dir = path.join(process.cwd(), ".cbio_secret_validate_" + Date.now());
    await fs.mkdir(dir, { recursive: true });
    process.env.C_BIO_VAULT_DIR = dir;

    const originalFetch = global.fetch;
    try {
        const keys = generateIdentityKeys();
        const identity = await CbioIdentity.load(keys);

        global.fetch = async (url, init) => {
            const requestUrl = typeof url === "string" ? url : url.toString();
            if (requestUrl === "https://validator.example.com/acquire") {
                return new Response(JSON.stringify({ token: "validator-secret" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }
            if (requestUrl === "https://validator.example.com/whoami") {
                const authHeader = new Headers(init?.headers).get("authorization");
                if (authHeader === "Bearer validator-secret") {
                    return new Response(JSON.stringify({
                        subject: "acct_123",
                        scopes: ["models.read"],
                    }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({ error: "unauthorized" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }
            return originalFetch(url, init);
        };

        const acquired = await identity.fetchJsonAndAddSecret({
            secretName: "validator-secret",
            url: "https://validator.example.com/acquire",
            extractKey: (response) => response.token,
        });
        assert.equal(acquired.success, true);

        const localResult = await identity.validateSecret("validator-secret", {
            async validate(handle) {
                const compareOk = await handle.compare("validator-secret");
                const proof = await handle.prove("nonce-1");
                return {
                    valid: compareOk,
                    status: compareOk ? "valid" : "invalid",
                    reason: compareOk ? undefined : "mismatch",
                    metadata: { proofLength: proof.length },
                };
            },
        });
        assert.equal(localResult.valid, true);
        assert.equal(localResult.status, "valid");
        assert.equal(typeof localResult.metadata?.proofLength, "number");
        console.log("✅ validateSecret supports local compare/proof validators");

        const remoteResult = await identity.validateSecret("validator-secret", {
            async validate(handle) {
                const response = await handle.fetchWithAuth("https://validator.example.com/whoami");
                if (!response.ok) {
                    return {
                        valid: false,
                        status: "invalid",
                        reason: `http_${response.status}`,
                    };
                }
                const json = await response.json();
                return {
                    valid: true,
                    status: "valid",
                    providerSubject: json.subject,
                    scopes: json.scopes,
                };
            },
        });
        assert.equal(remoteResult.valid, true);
        assert.equal(remoteResult.providerSubject, "acct_123");
        assert.deepEqual(remoteResult.scopes, ["models.read"]);
        console.log("✅ validateSecret supports remote validators without plaintext export");

        const defaultAgent = identity.getAgent();
        let blocked = false;
        try {
            await defaultAgent.validateSecret("validator-secret", {
                async validate() {
                    return { valid: true, status: "valid" };
                },
            });
        } catch (error) {
            blocked = IdentityError.isIdentityError(error) && error.code === IdentityErrorCode.PERMISSION_DENIED;
        }
        assert.equal(blocked, true);
        console.log("✅ Minimal agent cannot invoke validateSecret");

        const privilegedAgent = identity.getAgent({ permissions: { "vault:acquire": true, "vault:fetch": true, "vault:list": true } });
        const agentResult = await privilegedAgent.validateSecret("validator-secret", {
            async validate(handle) {
                const response = await handle.fetchWithAuth("https://validator.example.com/whoami");
                return { valid: response.ok, status: response.ok ? "valid" : "invalid" };
            },
        });
        assert.equal(agentResult.valid, true);
        console.log("✅ Privileged agent can invoke validateSecret");
    } finally {
        global.fetch = originalFetch;
        await fs.rm(dir, { recursive: true, force: true });
    }
}

run().catch((error) => {
    console.error("❌ Local secret validate test failed:", error);
    process.exit(1);
});
