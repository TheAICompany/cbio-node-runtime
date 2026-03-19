import {
    CbioIdentity,
    generateIdentityKeys,
    IdentityError,
    IdentityErrorCode,
    MemoryStorageProvider,
} from '../../dist/runtime/index.js';
import { ingestSecret } from './helpers/ingest_secret.js';

async function verifyTransparency() {
    console.log("--- Persistence Transparency & Error Clarity Test ---");

    console.log("\n[Test 1] Simulating EPERM from the storage provider...");
    try {
        const keys = generateIdentityKeys();
        const failingStorage = {
            async read() {
                return null;
            },
            async write() {
                const error = new Error('EPERM: operation not permitted, open simulated-vault-path');
                error.code = 'EPERM';
                throw error;
            },
            async delete() {},
            async has() {
                return false;
            },
        };
        await CbioIdentity.load(keys, {
            storage: failingStorage,
            storageKey: 'simulated-vault.enc',
        });
        throw new Error("SDK proceeded despite EPERM. It should have failed fast.");
    } catch (e) {
        if (
            IdentityError.isIdentityError(e) &&
            e.code === IdentityErrorCode.VAULT_PERSISTENCE_FAILED &&
            e.message.includes("CRITICAL: Vault persistence failed")
        ) {
            console.log("✅ SUCCESS: SDK correctly identified the write failure and threw a clear error.");
            console.log("Captured Error Message Snippet:\n", e.message.substring(0, 150) + "...");
        } else {
            throw new Error(`Caught an unexpected error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    console.log("\n[Test 2] Attempting to initialize with an in-memory writable provider...");
    try {
        const keys = generateIdentityKeys();
        const agent = await CbioIdentity.load(keys, {
            storage: new MemoryStorageProvider(),
            storageKey: 'memory-vault.enc',
            activityLog: { key: 'memory-vault.activity.jsonl' },
        });
        console.log("✅ SUCCESS: Agent created successfully using a writable custom provider.");
    } catch (e) {
        throw new Error(`SDK failed even with a writable custom provider: ${e instanceof Error ? e.message : String(e)}`);
    }

    console.log("\n[Test 3] Collision recovery must not rewrite explicit activity log key...");
    try {
        const storage = new MemoryStorageProvider();
        const keys = generateIdentityKeys();
        const explicitActivityKey = 'custom.activity.jsonl';
        const original = await CbioIdentity.load(keys, {
            storage,
            storageKey: 'collision_1.enc',
            activityLog: { key: explicitActivityKey },
        });
        await ingestSecret(original, 'auth', 'token-123');

        await storage.write('collision.enc', Buffer.alloc(40, 7));

        const recovered = await CbioIdentity.load(keys, {
            storage,
            storageKey: 'collision.enc',
            activityLog: { key: explicitActivityKey },
        });

        const originalFetch = global.fetch;
        global.fetch = async () => new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
        try {
            await recovered.fetchWithAuth('auth', 'http://127.0.0.1/mock');
        } finally {
            global.fetch = originalFetch;
        }

        const explicitLog = await storage.read(explicitActivityKey);
        const rewrittenLog = await storage.read('collision_1.activity.jsonl');
        if (!explicitLog || rewrittenLog) {
            throw new Error('Explicit activity log key should be preserved during collision recovery.');
        }
        console.log("✅ SUCCESS: Explicit activity log key survives collision recovery unchanged.");
    } catch (e) {
        throw new Error(`Collision recovery rewrote explicit activity log key: ${e instanceof Error ? e.message : String(e)}`);
    }
    console.log("\n--- Transparency Test Finished ---");
}

verifyTransparency().catch((error) => {
    console.error("❌ Transparency test failed:", error);
    process.exit(1);
});
