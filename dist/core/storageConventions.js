/**
 * Runtime storage conventions. Claw-biometric vault secret naming for child identities.
 * Not protocol objects. Protocol talks about public identities and signatures,
 * not local secret names or internal storage prefixes.
 */
import * as crypto from 'node:crypto';
export const CHILD_KEY_PREFIX = 'cbio:child:';
export function getChildIdentitySecretName(publicKey) {
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 12);
    return CHILD_KEY_PREFIX + hash;
}
//# sourceMappingURL=storageConventions.js.map