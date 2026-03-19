/**
 * Claw-biometric Core Identity. Runtime utilities over protocol primitives.
 * getVaultPath (runtime). Re-exports protocol for consumers.
 */
import { deriveRootAgentId } from '@the-ai-company/cbio-protocol';
import { getChildIdentitySecretName, CHILD_KEY_PREFIX } from './storageConventions.js';
export { deriveRootAgentId, getChildIdentitySecretName, CHILD_KEY_PREFIX };
export declare function getVaultPath(publicKey: string): string;
