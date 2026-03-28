/**
 * Claw-biometric Core Crypto. Runtime wrappers over protocol primitives.
 * LocalSigner, Signer. Re-exports protocol for consumers.
 */

import { IdentityError, IdentityErrorCode } from '../errors.js';
import {
    signPayload as protocolSignPayload,
    generateIdentityKeys,
    derivePublicKey,
    verifySignature,
    generateNonce,
    type KeyPair,
} from '@the-ai-company/cbio-protocol';

export type { KeyPair };
export { generateIdentityKeys, derivePublicKey, verifySignature, generateNonce };

export interface Signer {
    getPublicKey(): Promise<string>;
    sign(nonce: string): Promise<string>;
}

/**
 * @internal
 */
export class LocalSigner implements Signer {
    #private_key: string;
    #public_key: string;

    constructor(keyPair: KeyPair) {
        if (!keyPair.publicKey) {
            throw new IdentityError(IdentityErrorCode.SIGNER_REQUIRES_PUBLIC_KEY, "LocalSigner requires a publicKey. Use derivePublicKey() if you only have a privateKey.");
        }
        this.#private_key = keyPair.privateKey;
        this.#public_key = keyPair.publicKey;
    }

    async getPublicKey(): Promise<string> {
        return this.#public_key;
    }

    async sign(nonce: string): Promise<string> {
        return protocolSignPayload(this.#private_key, nonce);
    }

    /** @internal For exportIdentity only. Admin operation. */
    exportPrivateKey(): string {
        return this.#private_key;
    }
}

/** @internal Alias for protocol signPayload. */
export function signPayload(private_key: string, payload: string): string {
    return protocolSignPayload(private_key, payload);
}

import { scryptSync } from 'node:crypto';

/** @internal Use signPayload for protocol-level signing. */
export function signChallenge(private_key: string, nonce: string): string {
    return protocolSignPayload(private_key, nonce);
}

/**
 * Derives a 256-bit working key from a user password and salt (vault_id).
 * Using scrypt for memory-hard key derivation to resist brute-force attacks.
 */
export function deriveVaultWorkingKeyFromPassword(password: string, vault_id: string): string {
    // N: CPU/memory cost parameter (must be a power of 2)
    // r: Block size parameter
    // p: Parallelization parameter
    return scryptSync(password, vault_id, 32, { N: 16384, r: 8, p: 1 }).toString('base64url');
}
