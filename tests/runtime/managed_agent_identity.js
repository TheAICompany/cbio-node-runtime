import { CbioIdentity, IdentityError, IdentityErrorCode, generateIdentityKeys } from '../../dist/runtime/index.js';
import { createIdentityRef, signRevocationRecord } from '@the-ai-company/cbio-protocol';
import { getChildIdentitySecretName } from '@the-ai-company/cbio-node-runtime/protocol';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ingestSecret } from './helpers/ingest_secret.js';
import { readSealedSecret } from './helpers/read_sealed_secret.js';

async function testManagedAgentIdentity() {
    console.log('--- Managed Agent Identity Test ---');

    const DIR = path.join(process.cwd(), '.cbio_managed_agent_test_' + Date.now());
    await fs.mkdir(DIR, { recursive: true });
    process.env.C_BIO_VAULT_DIR = DIR;

    const mockBase = 'https://managed-agent-mock.local';
    const originalFetch = global.fetch;
    global.fetch = async (url, init) => {
        const u = typeof url === 'string' ? url : url.toString();
        if (u.startsWith(mockBase)) {
            return new Response(JSON.stringify({ token: 'agent-only-secret' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return originalFetch(url, init);
    };

    try {
        const rootKeys = generateIdentityKeys();
        const rootIdentity = await CbioIdentity.load(rootKeys);
        const rootAgentId = await rootIdentity.getAgentId();

        const managed = await rootIdentity.admin.managedAgents.issueManagedAgent({
            handle: {
                runtimePermissions: { 'vault:acquire': true, 'vault:fetch': true, 'vault:list': true },
            },
        });
        const managedAgentId = await managed.agent.getAgentId();

        if (managed.agentId !== managedAgentId) {
            throw new Error(`Managed agentId mismatch: ${managed.agentId} vs ${managedAgentId}`);
        }
        if (managedAgentId === rootAgentId) {
            throw new Error('Managed agent must have its own identity, not reuse root identity.');
        }

        const acq = await managed.agent.fetchJsonAndAddSecret({
            secretName: 'service-token',
            url: `${mockBase}/acquire`,
            extractKey: (r) => r.token || '',
            allowedOrigins: [mockBase],
        });
        if (!acq.success) throw new Error(`fetchJsonAndAddSecret failed: ${acq.error}`);
        if (!managed.agent.hasSecret('service-token')) {
            throw new Error('Managed agent could not access its own vault.');
        }
        if (rootIdentity.hasSecret('service-token')) {
            throw new Error('Root authority should not see managed agent vault contents in its own vault.');
        }

        const managedRecordKey = getChildIdentitySecretName(managed.publicKey);
        const stored = await readSealedSecret(rootIdentity, managedRecordKey);
        if (!stored) {
            throw new Error('Root authority did not persist managed agent identity record.');
        }
        const parsed = JSON.parse(stored);
        if (parsed.agentId !== managed.agentId || parsed.publicKey !== managed.publicKey || !parsed.issuedIdentity) {
            throw new Error('Managed agent identity record is incomplete (missing protocol fields).');
        }

        if (parsed.issuedIdentity.cbio_protocol !== 'v1.0' || parsed.issuedIdentity.kind !== 'issued_agent_identity') {
            throw new Error('Managed agent identity record has invalid protocol version or kind.');
        }

        if (parsed.issuedIdentity.agent.agent_id !== managed.agentId) {
            throw new Error('Issued identity agent_id mismatch.');
        }

        const activeCaps = rootIdentity.admin.managedAgents.getManagedAgentCapabilities(managed.publicKey);
        if (activeCaps.status !== 'active') {
            throw new Error(`Expected active capabilities before tampering, got ${JSON.stringify(activeCaps)}`);
        }

        const reloaded = await rootIdentity.admin.managedAgents.loadManagedAgent(managed.publicKey, {
            handle: {
                runtimePermissions: { 'vault:fetch': true, 'vault:list': true },
            },
        });
        if (!reloaded.agent.hasSecret('service-token')) {
            throw new Error('Reloaded managed agent did not recover its own vault.');
        }
        if (reloaded.agent.can('vault:acquire')) {
            throw new Error('Reloaded managed agent should reflect requested runtimePermissions.');
        }

        await rootIdentity.admin.vault.deleteSecret(managedRecordKey);
        const tamperedRecord = {
            ...parsed,
            privateKey: rootKeys.privateKey,
        };
        await ingestSecret(rootIdentity, managedRecordKey, JSON.stringify(tamperedRecord));

        let tamperedLoadBlocked = false;
        try {
            await rootIdentity.admin.managedAgents.loadManagedAgent(managed.publicKey);
        } catch (error) {
            tamperedLoadBlocked =
                IdentityError.isIdentityError(error) &&
                error.code === IdentityErrorCode.ISSUED_IDENTITY_INVALID &&
                /privateKey\/publicKey mismatch/i.test(error.message);
        }
        if (!tamperedLoadBlocked) {
            throw new Error('Tampered managed agent record should be rejected during load.');
        }

        await rootIdentity.admin.vault.deleteSecret(managedRecordKey);
        await ingestSecret(rootIdentity, managedRecordKey, stored);

        await rootIdentity.admin.vault.deleteSecret(managedRecordKey);
        await ingestSecret(rootIdentity, managedRecordKey, JSON.stringify({ publicKey: managed.publicKey }));
        const invalidCaps = rootIdentity.admin.managedAgents.getManagedAgentCapabilities(managed.publicKey);
        if (invalidCaps.status !== 'invalid' || invalidCaps.capabilities.length !== 0) {
            throw new Error(`Malformed managed agent record should produce invalid status, got ${JSON.stringify(invalidCaps)}`);
        }

        await rootIdentity.admin.vault.deleteSecret(managedRecordKey);
        await ingestSecret(rootIdentity, managedRecordKey, stored);

        const foreignAuthority = await CbioIdentity.load(generateIdentityKeys());
        const foreignManaged = await foreignAuthority.admin.managedAgents.issueManagedAgent({
            issue: {
                keys: { privateKey: parsed.privateKey, publicKey: parsed.publicKey },
            },
        });
        const foreignStored = await readSealedSecret(foreignAuthority, getChildIdentitySecretName(foreignManaged.publicKey));
        if (!foreignStored) {
            throw new Error('Foreign authority did not persist managed agent identity record.');
        }

        await rootIdentity.admin.vault.deleteSecret(managedRecordKey);
        await ingestSecret(rootIdentity, managedRecordKey, foreignStored);

        let foreignAuthorityRecordBlocked = false;
        try {
            await rootIdentity.admin.managedAgents.loadManagedAgent(managed.publicKey);
        } catch (error) {
            foreignAuthorityRecordBlocked =
                IdentityError.isIdentityError(error) &&
                error.code === IdentityErrorCode.ISSUED_IDENTITY_INVALID &&
                /authority public_key does not match this authority/i.test(error.message);
        }
        if (!foreignAuthorityRecordBlocked) {
            throw new Error('Managed agent record issued by a different authority should be rejected during load.');
        }

        await rootIdentity.admin.vault.deleteSecret(managedRecordKey);
        await ingestSecret(rootIdentity, managedRecordKey, stored);

        const bogusRevocation = signRevocationRecord(rootKeys.privateKey, {
            cbio_protocol: 'v1.0',
            kind: 'revocation_record',
            issuer: createIdentityRef(rootKeys.publicKey),
            target: {
                kind: 'issued_agent_identity',
                subject_agent_id: managed.agentId,
                sequence: 999,
            },
            revocation: {
                revoked_at: new Date().toISOString(),
                reason: 'bogus sequence',
            },
        });
        await ingestSecret(rootIdentity, `cbio:revocation:${managed.publicKey}`, JSON.stringify(bogusRevocation));

        const bogusRevocationReload = await rootIdentity.admin.managedAgents.loadManagedAgent(managed.publicKey, {
            handle: {
                runtimePermissions: { 'vault:fetch': true, 'vault:list': true },
            },
        });
        if (!bogusRevocationReload.agent.hasSecret('service-token')) {
            throw new Error('Invalid revocation record should not block managed agent recovery.');
        }

        await rootIdentity.admin.vault.deleteSecret(`cbio:revocation:${managed.publicKey}`);

        await rootIdentity.admin.managedAgents.revokeManagedAgent(managed.publicKey, 'test revocation');
        let revokedLoadBlocked = false;
        try {
            await rootIdentity.admin.managedAgents.loadManagedAgent(managed.publicKey);
        } catch (error) {
            revokedLoadBlocked =
                IdentityError.isIdentityError(error) && error.code === IdentityErrorCode.PERMISSION_DENIED;
        }
        if (!revokedLoadBlocked) {
            throw new Error('Revoked managed agent should not be loadable.');
        }

        console.log('✅ managed agent identity: independent identity, independent vault, root-governed recovery');
    } finally {
        global.fetch = originalFetch;
        await fs.rm(DIR, { recursive: true, force: true });
    }
}

testManagedAgentIdentity().catch((error) => {
    console.error('❌ Managed agent identity test failed:', error);
    process.exit(1);
});
