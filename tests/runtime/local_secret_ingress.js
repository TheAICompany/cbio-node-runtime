import assert from "node:assert";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
    CbioIdentity,
    generateIdentityKeys,
} from "../../dist/runtime/index.js";
import { readSealedSecret } from "./helpers/read_sealed_secret.js";

async function run() {
    const DIR = path.join(process.cwd(), ".cbio_local_secret_ingress_" + Date.now());
    await fs.mkdir(DIR, { recursive: true });
    const originalVaultDir = process.env.C_BIO_VAULT_DIR;
    process.env.C_BIO_VAULT_DIR = DIR;

    let ingress = null;
    try {
        const keys = generateIdentityKeys();
        const identity = await CbioIdentity.load(keys);

        try {
            ingress = await identity.startLocalSecretIngress({
                secretName: "issued-token",
                once: false,
            });
        } catch (error) {
            if (error && error.code === "EPERM") {
                console.log("ℹ️ Skipping local secret ingress test: loopback listen is not permitted in this environment");
                return;
            }
            throw error;
        }

        const unauthorized = await fetch(ingress.url, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
                "Authorization": "Bearer wrong-token",
            },
            body: "should-not-store",
        });
        assert.equal(unauthorized.status, 401);
        assert.equal(await readSealedSecret(identity, "issued-token"), undefined);
        console.log("✅ Local secret ingress requires an auth token");

        const response = await fetch(ingress.url, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
                "Authorization": `Bearer ${ingress.authToken}`,
            },
            body: "sk-issued-without-stdout",
        });

        assert.equal(response.status, 201);
        await ingress.waitForSecret();
        assert.equal(await readSealedSecret(identity, "issued-token"), "sk-issued-without-stdout");
        console.log("✅ Local secret ingress stores a newly issued secret without stdout handoff");
    } finally {
        if (ingress) {
            await ingress.close().catch(() => {});
        }
        await fs.rm(DIR, { recursive: true, force: true });
        process.env.C_BIO_VAULT_DIR = originalVaultDir;
    }
}

run().catch((error) => {
    console.error("❌ Local secret ingress test failed:", error);
    process.exit(1);
});
