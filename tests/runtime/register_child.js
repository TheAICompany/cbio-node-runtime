import { CbioIdentity, generateIdentityKeys } from '../../dist/runtime/index.js';
import { getChildIdentitySecretName } from '@the-ai-company/cbio-node-runtime/protocol';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function test() {
    const DIR = path.join(process.cwd(), '.cbio_child_test_' + Date.now());
    await fs.mkdir(DIR, { recursive: true });
    process.env.C_BIO_VAULT_DIR = DIR;

    const rootKeys = generateIdentityKeys();
    const agent = await CbioIdentity.load(rootKeys);

    const childKeys = generateIdentityKeys();
    const { publicKey: childPublicKey } = await agent.registerChildIdentity(childKeys);
    if (childPublicKey !== childKeys.publicKey) throw new Error(`PublicKey mismatch: ${childPublicKey} vs ${childKeys.publicKey}`);

    const secretName = getChildIdentitySecretName(childPublicKey);
    const stored = agent.admin.vault.getSecret(secretName);
    if (!stored) throw new Error('Child key not in vault');
    const parsed = JSON.parse(stored);
    if (parsed.privateKey !== childKeys.privateKey) throw new Error('Private key mismatch');
    if (!parsed.issuedIdentity) throw new Error('Issued identity missing in registration');
    if (parsed.issuedIdentity.cbio_protocol !== 'v1.0') throw new Error('Invalid protocol version in registration');

    const agentReload = await CbioIdentity.load(rootKeys);
    const reloaded = agentReload.admin.vault.getSecret(secretName);
    if (!reloaded) throw new Error('Child key not persisted');

    const childKeys2 = generateIdentityKeys();
    const { publicKey: childPublicKey2 } = await agent.registerChildIdentity(childKeys2);
    if (childPublicKey === childPublicKey2) throw new Error('Different identities must have different publicKeys');

    await agent.registerChildIdentity(childKeys);
    const afterOverwrite = agent.admin.vault.getSecret(secretName);
    if (JSON.parse(afterOverwrite).privateKey !== childKeys.privateKey) throw new Error('Re-register same identity should overwrite');

    await fs.rm(DIR, { recursive: true, force: true });
    console.log('✅ registerChildIdentity: returns publicKey, no collision, overwrite ok');
}

test().catch(e => {
    console.error('❌', e);
    process.exit(1);
});
