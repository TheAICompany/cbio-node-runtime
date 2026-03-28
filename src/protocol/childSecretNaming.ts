/**
 * Vault secret naming for child identities. CHILD_KEY_PREFIX, getChildIdentitySecretName.
 * Not protocol objects. Protocol talks about public identities and signatures,
 * not local secret names or internal storage prefixes.
 */

import * as crypto from 'node:crypto';

export const CHILD_KEY_PREFIX = 'cbio:child:' as const;

export function getChildIdentitySecretName(public_key: string): string {
    const hash = crypto.createHash('sha256').update(public_key).digest('hex').substring(0, 12);
    return CHILD_KEY_PREFIX + hash;
}
