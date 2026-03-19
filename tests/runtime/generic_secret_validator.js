import assert from "node:assert";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
    CbioIdentity,
    genericHttpValidator,
    generateIdentityKeys,
} from "../../dist/runtime/index.js";

async function run() {
    const dir = path.join(process.cwd(), ".cbio_generic_validator_" + Date.now());
    await fs.mkdir(dir, { recursive: true });
    process.env.C_BIO_VAULT_DIR = dir;

    const originalFetch = global.fetch;
    try {
        const keys = generateIdentityKeys();
        const identity = await CbioIdentity.load(keys);

        global.fetch = async (url, init) => {
            const requestUrl = typeof url === "string" ? url : url.toString();
            if (requestUrl === "https://generic.example.com/acquire") {
                return new Response(JSON.stringify({ token: "generic-secret" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }
            if (requestUrl === "https://generic.example.com/whoami") {
                const authHeader = new Headers(init?.headers).get("authorization");
                if (authHeader === "Bearer generic-secret") {
                    return new Response(JSON.stringify({
                        subject: "sub_generic",
                        scopes: ["scope:a", "scope:b"],
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
            secretName: "generic-secret",
            url: "https://generic.example.com/acquire",
            extractKey: (response) => response.token,
        });
        assert.equal(acquired.success, true);

        const validator = genericHttpValidator({
            url: "https://generic.example.com/whoami",
            extractResult: (_response, data) => ({
                providerSubject: data?.subject,
                scopes: data?.scopes,
            }),
        });

        const result = await identity.validateSecret("generic-secret", validator);
        assert.equal(result.valid, true);
        assert.equal(result.status, "valid");
        assert.equal(result.providerSubject, "sub_generic");
        assert.deepEqual(result.scopes, ["scope:a", "scope:b"]);
        console.log("✅ genericHttpValidator validates a secret through configured remote auth probe");
    } finally {
        global.fetch = originalFetch;
        await fs.rm(dir, { recursive: true, force: true });
    }
}

run().catch((error) => {
    console.error("❌ Generic secret validator test failed:", error);
    process.exit(1);
});
