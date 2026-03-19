/**
 * Claw-biometric Core Crypto. Runtime wrappers over protocol primitives.
 * LocalSigner, Signer. Re-exports protocol for consumers.
 */
import { generateIdentityKeys, derivePublicKey, verifySignature, generateNonce, type KeyPair } from '@the-ai-company/cbio-protocol';
export type { KeyPair };
export { generateIdentityKeys, derivePublicKey, verifySignature, generateNonce };
export interface Signer {
    getPublicKey(): Promise<string>;
    sign(nonce: string): Promise<string>;
}
export declare class LocalSigner implements Signer {
    #private;
    constructor(keyPair: KeyPair);
    getPublicKey(): Promise<string>;
    sign(nonce: string): Promise<string>;
    /** @internal For exportIdentity only. Admin operation. */
    exportPrivateKey(): string;
}
/** @internal Alias for protocol signPayload. */
export declare function signPayload(privateKey: string, payload: string): string;
/** @internal Use signPayload for protocol-level signing. */
export declare function signChallenge(privateKey: string, nonce: string): string;
