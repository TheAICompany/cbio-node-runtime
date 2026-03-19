import assert from "node:assert";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { CbioIdentity, IdentityError, IdentityErrorCode, generateIdentityKeys } from "../../dist/runtime/index.js";

async function run() {
    const dir = path.join(process.cwd(), ".cbio_secret_guardrails_" + Date.now());
    await fs.mkdir(dir, { recursive: true });
    process.env.C_BIO_VAULT_DIR = dir;

    const originalFetch = global.fetch;
    try {
        const keys = generateIdentityKeys();
        const identity = await CbioIdentity.load(keys);

        global.fetch = async () =>
            new Response(JSON.stringify({ token: "guardrail-secret" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        const acquired = await identity.fetchJsonAndAddSecret({
            secretName: "guardrail-secret",
            url: "https://guardrails.example.com/acquire",
            extractKey: (response) => response.token,
        });
        assert.equal(acquired.success, true);

        await identity.compareSecret("guardrail-secret", "guardrail-secret");
        await identity.proveSecret("guardrail-secret", "challenge");
        await identity.validateSecret("guardrail-secret", {
            async validate() {
                return { valid: true, status: "valid" };
            },
        });

        const log = await identity.admin.vault.getActivityLog();
        assert.ok(log.some((entry) => entry.action === "compareSecret"));
        assert.ok(log.some((entry) => entry.action === "proveSecret"));
        assert.ok(log.some((entry) => entry.action === "validateSecret"));
        console.log("✅ Local compare/prove/validate operations append activity log entries");

        let limited = false;
        for (let i = 0; i < 80; i++) {
            try {
                await identity.compareSecret("guardrail-secret", "wrong");
            } catch (error) {
                limited =
                    IdentityError.isIdentityError(error) &&
                    error.code === IdentityErrorCode.SECRET_OPERATION_RATE_LIMITED;
                if (limited) break;
                throw error;
            }
        }
        assert.equal(limited, true);
        console.log("✅ Local compare operation is rate-limited");
    } finally {
        global.fetch = originalFetch;
        await fs.rm(dir, { recursive: true, force: true });
    }
}

run().catch((error) => {
    console.error("❌ Local secret guardrails test failed:", error);
    process.exit(1);
});
