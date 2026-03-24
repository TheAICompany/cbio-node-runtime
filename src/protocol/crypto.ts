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
    #privateKey: string;
    #publicKey: string;

    constructor(keyPair: KeyPair) {
        if (!keyPair.publicKey) {
            throw new IdentityError(IdentityErrorCode.SIGNER_REQUIRES_PUBLIC_KEY, "LocalSigner requires a publicKey. Use derivePublicKey() if you only have a privateKey.");
        }
        this.#privateKey = keyPair.privateKey;
        this.#publicKey = keyPair.publicKey;
    }

    async getPublicKey(): Promise<string> {
        return this.#publicKey;
    }

    async sign(nonce: string): Promise<string> {
        return protocolSignPayload(this.#privateKey, nonce);
    }

    /** @internal For exportIdentity only. Admin operation. */
    exportPrivateKey(): string {
        return this.#privateKey;
    }
}

/** @internal Alias for protocol signPayload. */
export function signPayload(privateKey: string, payload: string): string {
    return protocolSignPayload(privateKey, payload);
}

import { scryptSync } from 'node:crypto';

/** @internal Use signPayload for protocol-level signing. */
export function signChallenge(privateKey: string, nonce: string): string {
    return protocolSignPayload(privateKey, nonce);
}

/**
 * Derives a 256-bit working key from a user password and salt (vaultId).
 * Using scrypt for memory-hard key derivation to resist brute-force attacks.
 */
export function deriveVaultWorkingKeyFromPassword(password: string, vaultId: string): string {
    // N: CPU/memory cost parameter (must be a power of 2)
    // r: Block size parameter
    // p: Parallelization parameter
    return scryptSync(password, vaultId, 32, { N: 16384, r: 8, p: 1 }).toString('base64url');
}
