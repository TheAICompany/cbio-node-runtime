/**
 * Runtime storage conventions. Claw-biometric vault secret naming for child identities.
 * Not protocol objects. Protocol talks about public identities and signatures,
 * not local secret names or internal storage prefixes.
 */
export declare const CHILD_KEY_PREFIX: "cbio:child:";
export declare function getChildIdentitySecretName(publicKey: string): string;
