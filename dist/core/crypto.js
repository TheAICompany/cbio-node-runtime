/**
 * Claw-biometric Core Crypto. Runtime wrappers over protocol primitives.
 * LocalSigner, Signer. Re-exports protocol for consumers.
 */
import { IdentityError, IdentityErrorCode } from '../errors.js';
import { signPayload as protocolSignPayload, generateIdentityKeys, derivePublicKey, verifySignature, generateNonce, } from '@the-ai-company/cbio-protocol';
export { generateIdentityKeys, derivePublicKey, verifySignature, generateNonce };
export class LocalSigner {
    #privateKey;
    #publicKey;
    constructor(keyPair) {
        if (!keyPair.publicKey) {
            throw new IdentityError(IdentityErrorCode.SIGNER_REQUIRES_PUBLIC_KEY, "LocalSigner requires a publicKey. Use derivePublicKey() if you only have a privateKey.");
        }
        this.#privateKey = keyPair.privateKey;
        this.#publicKey = keyPair.publicKey;
    }
    async getPublicKey() {
        return this.#publicKey;
    }
    async sign(nonce) {
        return protocolSignPayload(this.#privateKey, nonce);
    }
    /** @internal For exportIdentity only. Admin operation. */
    exportPrivateKey() {
        return this.#privateKey;
    }
}
/** @internal Alias for protocol signPayload. */
export function signPayload(privateKey, payload) {
    return protocolSignPayload(privateKey, payload);
}
/** @internal Use signPayload for protocol-level signing. */
export function signChallenge(privateKey, nonce) {
    return protocolSignPayload(privateKey, nonce);
}
//# sourceMappingURL=crypto.js.map