/**
 * Claw-biometric Core Identity. Runtime utilities over protocol primitives.
 * getVaultPath (runtime). Re-exports protocol for consumers.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { deriveRootAgentId } from '@the-ai-company/cbio-protocol';
import { getChildIdentitySecretName, CHILD_KEY_PREFIX } from './storageConventions.js';

export { deriveRootAgentId, getChildIdentitySecretName, CHILD_KEY_PREFIX };

export function getVaultPath(publicKey: string): string {
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 12);
    const baseDir = process.env.C_BIO_VAULT_DIR || path.join(os.homedir(), '.c-bio');
    return path.join(baseDir, `vault_${hash}.enc`);
}
