import { CbioIdentity, generateIdentityKeys, getChildIdentitySecretName } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function test() {
    const DIR = path.join(process.cwd(), '.cbio_child_test_' + Date.now());
    await fs.mkdir(DIR, { recursive: true });
    process.env.C_BIO_VAULT_DIR = DIR;

    const rootKeys = generateIdentityKeys();
    const agent = await CbioIdentity.load(rootKeys);

    const childKeys = generateIdentityKeys();
    const secretName = await agent.registerChildIdentity(childKeys);

    const expectedSecretName = getChildIdentitySecretName(childKeys.publicKey);
    if (secretName !== expectedSecretName) throw new Error(`Secret name mismatch: ${secretName} vs ${expectedSecretName}`);

    const stored = agent.admin.getSecret(secretName);
    if (!stored) throw new Error('Child key not in vault');
    const parsed = JSON.parse(stored);
    if (parsed.privateKey !== childKeys.privateKey) throw new Error('Private key mismatch');
    if (!parsed.issuedIdentity) throw new Error('Issued identity missing in registration');
    if (parsed.issuedIdentity.cbio_protocol !== 'v1.0') throw new Error('Invalid protocol version in registration');

    const agentReload = await CbioIdentity.load(rootKeys);
    const reloaded = agentReload.admin.getSecret(secretName);
    if (!reloaded) throw new Error('Child key not persisted');

    const childKeys2 = generateIdentityKeys();
    const secretName2 = await agent.registerChildIdentity(childKeys2);
    if (secretName === secretName2) throw new Error('Different identities must have different secret names');

    await agent.registerChildIdentity(childKeys);
    const afterOverwrite = agent.admin.getSecret(secretName);
    if (JSON.parse(afterOverwrite).privateKey !== childKeys.privateKey) throw new Error('Re-register same identity should overwrite');

    await fs.rm(DIR, { recursive: true, force: true });
    console.log('✅ registerChildIdentity: auto secretName, no collision, overwrite ok');
}

test().catch(e => {
    console.error('❌', e);
    process.exit(1);
});
