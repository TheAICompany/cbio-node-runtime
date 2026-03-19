/**
 * ActivityLog: local-only audit log, separate from vault.
 * Verifies: fetchWithAuth/fetchJsonAndAddSecret append; getActivityLog on Owner only; Agent has no access.
 */
import { CbioIdentity, generateIdentityKeys, IdentityError, IdentityErrorCode } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function testActivityLog() {
    console.log("=== ActivityLog Acceptance ===\n");

    const LOCAL_VAULT_DIR = path.join(process.cwd(), '.cbio_activity_log_test');
    await fs.mkdir(LOCAL_VAULT_DIR, { recursive: true });
    process.env.C_BIO_VAULT_DIR = LOCAL_VAULT_DIR;

    const keys = generateIdentityKeys();
    const agent = await CbioIdentity.load(keys);

    console.log("--- 1. Identity facts present ---");
    if (agent.agentId && agent.publicKey) {
        console.log(`✅ Agent loaded with ID: ${agent.agentId.substring(0, 10)}...`);
    } else {
        throw new Error("Agent missing identity facts");
    }

    console.log("--- 2. Direct access restricted ---");
    // Standard agent should not have direct management methods (moved to .admin)
    if ((agent).getActivityLog === undefined) {
        console.log("✅ Agent has no direct getActivityLog (it's in .admin)");
    } else {
        throw new Error("Agent should not have direct getActivityLog.");
    }

    console.log("--- 3. Admin getActivityLog initially empty ---");
    const initial = await agent.admin.vault.getActivityLog();
    if (Array.isArray(initial) && initial.length === 0) {
        console.log("✅ Initial activityLog is empty array");
    } else {
        throw new Error(`Expected empty activity log, got ${JSON.stringify(initial)}`);
    }

    await agent.admin.vault.addSecret('audit-test', 'secret-val');
    const afterSet = await agent.admin.vault.getActivityLog();
    if (afterSet.length === 0) {
        console.log("✅ addSecret does not add to activityLog");
    } else {
        throw new Error(`addSecret should not add activity log entries, got ${afterSet.length}`);
    }

    const originalFetch = global.fetch;
    const base = 'http://127.0.0.1/mock';
    global.fetch = async (url, options = {}) => {
        const requestUrl = typeof url === 'string' ? url : url.toString();
        if (requestUrl === `${base}/`) {
            return new Response('{}', {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        if (requestUrl === `${base}/post`) {
            const body = options.body === undefined ? {} : JSON.parse(options.body);
            return new Response(JSON.stringify(body), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
    };
    try {
        console.log("--- 4. fetchWithAuth adds to activityLog ---");
        const res = await agent.fetchWithAuth('audit-test', `${base}/`);
        if (!res.ok) {
            throw new Error(`fetchWithAuth failed with status ${res.status}`);
        }
        const afterFetch = await agent.admin.vault.getActivityLog();
        const fetchUrl = `${base}/`;
        if (afterFetch.length === 1 && afterFetch[0].action === 'fetchWithAuth' && afterFetch[0].secretName === 'audit-test' && afterFetch[0].url === fetchUrl) {
            console.log("✅ fetchWithAuth added entry with action, secretName, url");
        } else {
            throw new Error(`Expected one fetchWithAuth entry, got ${JSON.stringify(afterFetch)}`);
        }

        console.log("--- 5. fetchJsonAndAddSecret adds to activityLog ---");
        const acq = await agent.fetchJsonAndAddSecret({
            secretName: 'acquired-alias',
            url: `${base}/post`,
            method: 'POST',
            body: { api_key: 'fake-key-xyz' },
            extractKey: (res) => res.api_key || ''
        });
        if (!acq.success) {
            throw new Error(`fetchJsonAndAddSecret failed: ${acq.error}`);
        }
        const afterAcq = await agent.admin.vault.getActivityLog();
        const acqEntry = afterAcq.find(e => e.action === 'fetchJsonAndAddSecret' && e.secretName === 'acquired-alias');
        if (acqEntry && acqEntry.url) {
            console.log("✅ fetchJsonAndAddSecret added entry");
        } else {
            throw new Error(`Expected fetchJsonAndAddSecret entry, got ${JSON.stringify(afterAcq)}`);
        }

        console.log("--- 5b. JSON scalar bodies are preserved ---");
        const zeroBody = await agent.fetchJsonAndAddSecret({
            secretName: 'scalar-zero',
            url: `${base}/post`,
            method: 'POST',
            body: 0,
            extractKey: (res) => String(res),
        });
        if (!zeroBody.success || zeroBody.data !== 0) {
            throw new Error(`Expected scalar zero body to round-trip, got ${JSON.stringify(zeroBody)}`);
        }
        const falseBody = await agent.fetchJsonAndUpdateSecret({
            secretName: 'scalar-zero',
            url: `${base}/post`,
            method: 'POST',
            body: false,
            extractKey: (res) => String(res),
        });
        if (!falseBody.success || falseBody.data !== false) {
            throw new Error(`Expected scalar false body to round-trip, got ${JSON.stringify(falseBody)}`);
        }
        console.log("✅ JSON scalar bodies are sent instead of being dropped");

        console.log("--- 6. Persistence ---");
        const agent2 = await CbioIdentity.load(keys);
        const log2 = await agent2.admin.vault.getActivityLog();
        if (log2.length >= 2) {
            console.log("✅ ActivityLog persisted across reload");
        } else {
            throw new Error(`Expected at least two entries after reload, got ${log2.length}`);
        }

        console.log("--- 7. fetchJsonAndAddSecret/fetchJsonAndUpdateSecret return FetchResult when activity log write fails (no throw) ---");
        const { MemoryStorageProvider } = await import('../../dist/runtime/index.js');
        const realStorage = new MemoryStorageProvider();
        const failingActivityLogStorage = {
            async read(k) { return realStorage.read(k); },
            async write(k, data) {
                if (k.endsWith('.activity.jsonl')) throw new Error('Simulated activity log write failure');
                return realStorage.write(k, data);
            },
            async delete(k) { return realStorage.delete(k); },
            async has(k) { return realStorage.has(k); },
        };
        const keys2 = generateIdentityKeys();
        const agentFailing = await CbioIdentity.load(keys2, {
            storage: failingActivityLogStorage,
            storageKey: 'activity-fail-test.enc',
            activityLog: { key: 'activity-fail-test.activity.jsonl' },
        });
        await agentFailing.admin.vault.addSecret('pre-seeded', 'val');
        await agentFailing.admin.vault.addSecret('rotatable', 'initial', { allowedOrigins: [base] });
        try {
            await agentFailing.fetchWithAuth('nonexistent', `${base}/`);
        } catch (e) {
            if (!IdentityError.isIdentityError(e) || e.code !== IdentityErrorCode.SECRET_NOT_FOUND) {
                throw new Error(`Expected IdentityError(SECRET_NOT_FOUND) when append fails, got ${e?.constructor?.name}: ${e?.message}`);
            }
        }
        console.log("✅ fetchWithAuth SECRET_NOT_FOUND: throws IdentityError even when activity log write fails");
        const addFailResult = await agentFailing.fetchJsonAndAddSecret({
            secretName: 'will-fail',
            url: `${base}/nonexistent`,
            extractKey: () => '',
        });
        if (!addFailResult.success && addFailResult.activityLogWriteFailed === true) {
            console.log("✅ fetchJsonAndAddSecret fail path: returns FetchResult with activityLogWriteFailed, no throw");
        } else {
            throw new Error(`Expected { success: false, activityLogWriteFailed: true }, got ${JSON.stringify(addFailResult)}`);
        }
        const addSuccessResult = await agentFailing.fetchJsonAndAddSecret({
            secretName: 'will-succeed',
            url: `${base}/post`,
            body: { token: 'x' },
            extractKey: (r) => r.token || '',
        });
        if (addSuccessResult.success && addSuccessResult.activityLogWriteFailed === true) {
            console.log("✅ fetchJsonAndAddSecret success path: returns FetchResult with activityLogWriteFailed, no throw");
        } else {
            throw new Error(`Expected { success: true, activityLogWriteFailed: true }, got ${JSON.stringify(addSuccessResult)}`);
        }
        const updateFailResult = await agentFailing.fetchJsonAndUpdateSecret({
            secretName: 'rotatable',
            url: `${base}/nonexistent`,
            extractKey: () => '',
        });
        if (!updateFailResult.success && updateFailResult.activityLogWriteFailed === true) {
            console.log("✅ fetchJsonAndUpdateSecret fail path: returns FetchResult with activityLogWriteFailed, no throw");
        } else {
            throw new Error(`Expected { success: false, activityLogWriteFailed: true }, got ${JSON.stringify(updateFailResult)}`);
        }
        const updateSuccessResult = await agentFailing.fetchJsonAndUpdateSecret({
            secretName: 'rotatable',
            url: `${base}/post`,
            body: { token: 'rotated' },
            extractKey: (r) => r.token || '',
        });
        if (updateSuccessResult.success && updateSuccessResult.activityLogWriteFailed === true) {
            console.log("✅ fetchJsonAndUpdateSecret success path: returns FetchResult with activityLogWriteFailed, no throw");
        } else {
            throw new Error(`Expected { success: true, activityLogWriteFailed: true }, got ${JSON.stringify(updateSuccessResult)}`);
        }
    } finally {
        global.fetch = originalFetch;
    }

    await fs.rm(LOCAL_VAULT_DIR, { recursive: true, force: true });
    console.log("\n=== All ActivityLog acceptance criteria passed ===\n");
}

testActivityLog().catch((e) => {
    console.error("❌ Activity log test failed:", e);
    process.exit(1);
});
