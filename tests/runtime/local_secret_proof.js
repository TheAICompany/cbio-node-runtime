import assert from "node:assert";
import { createHmac } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { CbioIdentity, IdentityError, IdentityErrorCode, generateIdentityKeys } from "../../dist/runtime/index.js";

async function run() {
    const dir = path.join(process.cwd(), ".cbio_secret_proof_" + Date.now());
    await fs.mkdir(dir, { recursive: true });
    process.env.C_BIO_VAULT_DIR = dir;

    try {
        const keys = generateIdentityKeys();
        const identity = await CbioIdentity.load(keys);
        const originalFetch = global.fetch;
        global.fetch = async () =>
            new Response(JSON.stringify({ token: "local-proof-secret" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        try {
            const acquired = await identity.fetchJsonAndAddSecret({
                secretName: "kms-like",
                url: "https://proof.example.com/acquire",
                extractKey: (response) => response.token,
            });
            assert.equal(acquired.success, true);
        } finally {
            global.fetch = originalFetch;
        }

        assert.equal(await identity.compareSecret("kms-like", "local-proof-secret"), true);
        assert.equal(await identity.compareSecret("kms-like", "wrong-secret"), false);
        console.log("✅ Local secret compare returns only pass/fail");

        const challenge = "challenge-123";
        const proof = await identity.proveSecret("kms-like", challenge);
        const expected = createHmac("sha256", "local-proof-secret").update(challenge, "utf8").digest("base64url");
        assert.equal(proof, expected);
        console.log("✅ Local secret proof returns an HMAC proof without exporting the secret");

        const defaultAgent = identity.getAgent();
        let blocked = false;
        try {
            await defaultAgent.compareSecret("kms-like", "local-proof-secret");
        } catch (error) {
            blocked =
                IdentityError.isIdentityError(error) &&
                error.code === IdentityErrorCode.PERMISSION_DENIED;
        }
        assert.equal(blocked, true);
        console.log("✅ Minimal agent cannot invoke local proof operations");

        const privilegedAgent = identity.getAgent({ permissions: { "vault:acquire": true, "vault:list": true } });
        assert.equal(await privilegedAgent.compareSecret("kms-like", "local-proof-secret"), true);
        assert.equal(await privilegedAgent.proveSecret("kms-like", challenge), expected);
        console.log("✅ Privileged agent can use local proof operations without plaintext export");
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
}

run().catch((error) => {
    console.error("❌ Local secret proof test failed:", error);
    process.exit(1);
});
