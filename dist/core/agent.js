import { derivePublicKey, LocalSigner, generateIdentityKeys } from './crypto.js';
import { CbioVault } from './vault.js';
import { AuthClient } from './authClient.js';
import { SecretAcquisition } from './secretAcquisition.js';
import { getChildIdentitySecretName, deriveRootAgentId, getVaultPath } from './identity.js';
import { createIdentityRef, signIssuedAgentIdentity, signRevocationRecord, verifyIssuedAgentIdentity, } from '@the-ai-company/cbio-protocol';
import { IdentityError, IdentityErrorCode } from '../errors.js';
export { CHILD_KEY_PREFIX, getChildIdentitySecretName } from './identity.js';
/**
 * CbioIdentity
 *
 * The primary Identity container. Represents an agent's identity and its associated vault.
 * This is the high-privilege handle that contains administrative capabilities (.admin)
 * and private keys.
 */
export class CbioIdentity {
    signer;
    _vault;
    admin;
    agentId;
    publicKey;
    #issuedIdentity;
    _authClient;
    _secretAcquisition;
    constructor(signer, _vault, agentId, publicKey) {
        this.signer = signer;
        this._vault = _vault;
        this.agentId = agentId || '';
        this.publicKey = publicKey || '';
        const appendLog = (entry) => this._vault.appendActivityLogEntry(entry);
        this._authClient = new AuthClient(this._vault, this.signer, appendLog);
        this._secretAcquisition = new SecretAcquisition(this._vault, appendLog);
        this.admin = new CbioManagementFacet(this, this._vault);
    }
    /**
     * Primary entry point: Load identity from keys and initialize vault.
     */
    static async load(keys, options) {
        const opts = options ?? {};
        const priv = keys.privateKey;
        const pub = keys.publicKey || derivePublicKey(priv);
        const agentId = deriveRootAgentId(pub);
        const signer = new LocalSigner({ publicKey: pub, privateKey: priv });
        const identity = new CbioIdentity(signer, new CbioVault(), agentId, pub);
        const storageKey = opts.storageKey ?? opts.vaultPath ?? getVaultPath(pub);
        const activityLogKey = opts.activityLogKey === null ? undefined : (opts.activityLogKey ?? storageKey.replace(/\.enc$/, '') + '.activity.jsonl');
        await identity._vault.initFromStorage(signer, storageKey, opts.storage, activityLogKey);
        return identity;
    }
    async fetchWithAuth(secretName, url, options) {
        return this._authClient.fetchWithAuth(secretName, url, options ?? {});
    }
    createFetchWithAuth(secretName) {
        return this._authClient.createFetchWithAuth(secretName);
    }
    async getPublicKey() {
        return this.publicKey || this.signer.getPublicKey();
    }
    async getAgentId() {
        return this.agentId || deriveRootAgentId(await this.getPublicKey());
    }
    async fetchAndAddSecret(options) {
        return this._secretAcquisition.fetchAndAddSecret(options);
    }
    async fetchAndUpdateSecret(options) {
        return this._secretAcquisition.fetchAndUpdateSecret(options);
    }
    hasSecret(secretName) {
        return this._vault.hasSecret(secretName);
    }
    listSecretNames() {
        return this._vault.listSecretNames();
    }
    /**
     * Register a newly created child identity to the parent vault.
     */
    async registerChildIdentity(keys, options) {
        return this.admin.registerChildIdentity(keys, options);
    }
    async authenticate(nonce) {
        return this.signer.sign(nonce);
    }
    /**
     * Create a standard Agent handle for this identity.
     * The Agent handle DOES NOT have an .admin property and does not expose the signer/private key.
     * This is the recommended handle to pass to an autonomous LLM.
     *
     * @param permissions Optional granular permissions to grant to this handle.
     *                    If not provided, it attempts to auto-derive permissions from the
     *                    identity's protocol-level capabilities (if available),
     *                    otherwise defaults to restricted access (vault:fetch, vault:list).
     */
    getAgent(permissions) {
        let finalPerms = permissions;
        if (!finalPerms && this.#issuedIdentity?.capabilities) {
            // Auto-derive from protocol capabilities
            finalPerms = {};
            for (const cap of this.#issuedIdentity.capabilities) {
                finalPerms[cap] = true;
            }
            // Always ensure basics if any capabilities exist
            finalPerms['vault:fetch'] = true;
            finalPerms['vault:list'] = true;
        }
        return new CbioAgent(this._authClient, this._secretAcquisition, this.agentId, this.publicKey, finalPerms);
    }
    /**
     * @internal
     * Set the protocol-level identity certificate for this identity.
     */
    setIssuedIdentity(identity) {
        this.#issuedIdentity = identity;
    }
}
/**
 * CbioAgent
 *
 * A safety-wrapped version of an Identity designed for autonomous LLMs.
 * It provides only the Standard facet (fetchWithAuth, etc.) by default and hides
 * all administrative capabilities and private keys.
 */
export class CbioAgent {
    agentId;
    publicKey;
    #authClient;
    #secretAcquisition;
    #permissions;
    constructor(authClient, secretAcquisition, agentId, publicKey, permissions) {
        this.agentId = agentId;
        this.publicKey = publicKey;
        this.#authClient = authClient;
        this.#secretAcquisition = secretAcquisition;
        // Default to a restricted worker (vault:fetch, vault:list) if no permissions specified
        this.#permissions = permissions || { 'vault:fetch': true, 'vault:list': true };
    }
    /**
     * View the runtime permissions granted to this handle.
     */
    get permissions() {
        return Object.freeze({ ...this.#permissions });
    }
    _checkPermission(permission) {
        if (!this.#permissions[permission]) {
            throw new IdentityError(IdentityErrorCode.PERMISSION_DENIED, `Agent handle does not have '${permission}' permission.`);
        }
    }
    async fetchWithAuth(secretName, url, options) {
        // vault:fetch is required for network auth
        this._checkPermission('vault:fetch');
        return this.#authClient.fetchWithAuth(secretName, url, options ?? {});
    }
    createFetchWithAuth(secretName) {
        this._checkPermission('vault:fetch');
        return this.#authClient.createFetchWithAuth(secretName);
    }
    async getPublicKey() {
        return this.publicKey;
    }
    async getAgentId() {
        return this.agentId;
    }
    async fetchAndAddSecret(options) {
        this._checkPermission('vault:acquire');
        return this.#secretAcquisition.fetchAndAddSecret(options);
    }
    async fetchAndUpdateSecret(options) {
        this._checkPermission('vault:acquire');
        return this.#secretAcquisition.fetchAndUpdateSecret(options);
    }
    hasSecret(secretName) {
        this._checkPermission('vault:list');
        return this.#secretAcquisition._vault.hasSecret(secretName);
    }
    listSecretNames() {
        this._checkPermission('vault:list');
        return this.#secretAcquisition._vault.listSecretNames();
    }
    /**
     * Check if this agent handle has the specified runtime permission.
     */
    can(permission) {
        return !!this.#permissions[permission];
    }
}
/**
 * CbioManagementFacet
 *
 * Provides administrative (high-risk) capabilities for a CbioIdentity.
 */
export class CbioManagementFacet {
    _identity;
    _vault;
    constructor(_identity, _vault) {
        this._identity = _identity;
        this._vault = _vault;
    }
    async addSecret(secretName, secretValue, options) {
        await this._vault.addSecret(secretName, secretValue, options);
    }
    getSecret(secretName) {
        return this._vault.getSecret(secretName);
    }
    /**
     * Get the protocol-level capabilities granted to a managed agent.
     * Includes a check for revocation.
     */
    getManagedAgentCapabilities(publicKey) {
        const secretName = getChildIdentitySecretName(publicKey);
        const stored = this.getSecret(secretName);
        if (!stored)
            return [];
        // Check for revocation
        const revocationKey = `cbio:revocation:${publicKey}`;
        if (this._vault.hasSecret(revocationKey)) {
            return []; // Agent is revoked, return no capabilities
        }
        try {
            const parsed = JSON.parse(stored);
            return parsed.issuedIdentity.capabilities || [];
        }
        catch {
            return [];
        }
    }
    /**
     * Revoke a managed agent by issuing a protocol-level revocation record.
     */
    async revokeManagedAgent(publicKey, reason) {
        const secretName = getChildIdentitySecretName(publicKey);
        if (!this._vault.hasSecret(secretName)) {
            throw new IdentityError(IdentityErrorCode.SECRET_NOT_FOUND, `Managed agent with public key '${publicKey}' not found in this vault.`);
        }
        if (!(this._identity.signer instanceof LocalSigner)) {
            throw new IdentityError(IdentityErrorCode.SIGNER_REQUIRES_PRIVATE_KEY, 'Authority must have a LocalSigner to sign revocation records.');
        }
        const issuerPublicKey = await this._identity.getPublicKey();
        const unsignedRevocation = {
            cbio_protocol: 'v1.0',
            kind: 'revocation_record',
            issuer: createIdentityRef(issuerPublicKey),
            target: {
                kind: 'issued_agent_identity',
                subject_agent_id: deriveRootAgentId(publicKey),
                sequence: 1, // Currently assuming sequence 1 for simple use cases
            },
            revocation: {
                revoked_at: new Date().toISOString(),
                reason,
            },
        };
        const signedRevocation = signRevocationRecord(this._identity.signer.exportPrivateKey(), unsignedRevocation);
        // Store the revocation record
        const revocationKey = `cbio:revocation:${publicKey}`;
        await this.addSecret(revocationKey, JSON.stringify(signedRevocation));
    }
    hasSecret(secretName) {
        return this._vault.hasSecret(secretName);
    }
    async deleteSecret(secretName) {
        await this._vault.deleteSecret(secretName);
    }
    async setSecretAllowedOrigins(secretName, allowedOrigins) {
        await this._vault.setSecretAllowedOrigins(secretName, allowedOrigins);
    }
    async getActivityLog() {
        return this._vault.getActivityLog();
    }
    async getActivityLogMetadata() {
        return this._vault.getActivityLogMetadata();
    }
    async mergeFrom(otherIdentity, options) {
        return this._vault.mergeFrom(otherIdentity._vault, options);
    }
    seal(kdk) {
        return this._vault.seal(kdk);
    }
    loadFromSealedBlob(kdk, sealedBlob) {
        this._vault.unseal(kdk, sealedBlob);
    }
    async serializeToBlob() {
        return this._vault.serializeToBlob(this._identity.signer);
    }
    async saveVault(path) {
        await this._vault.save(this._identity.signer, path || './vault.enc');
    }
    async issueManagedAgent(options) {
        const opts = options ?? {};
        const keys = opts.keys ?? generateIdentityKeys();
        const publicKey = keys.publicKey || derivePublicKey(keys.privateKey);
        const agentId = deriveRootAgentId(publicKey);
        const secretName = opts.secretName ?? getChildIdentitySecretName(publicKey);
        if (!(this._identity.signer instanceof LocalSigner)) {
            throw new IdentityError(IdentityErrorCode.SIGNER_REQUIRES_PRIVATE_KEY, 'CbioIdentity must have a LocalSigner to issue managed agents (requires private key access for signing).');
        }
        const issuerPublicKey = await this._identity.getPublicKey();
        const unsignedIdentity = {
            cbio_protocol: 'v1.0',
            kind: 'issued_agent_identity',
            agent: createIdentityRef(publicKey),
            authority: createIdentityRef(issuerPublicKey),
            issuance: {
                issued_at: new Date().toISOString(),
                sequence: 1,
            },
            capabilities: opts.capabilities,
        };
        const issuedIdentity = signIssuedAgentIdentity(this._identity.signer.exportPrivateKey(), unsignedIdentity);
        const record = {
            agentId,
            publicKey,
            privateKey: keys.privateKey,
            issuedIdentity,
        };
        const stored = JSON.stringify(record);
        if (this._vault.hasSecret(secretName)) {
            await this._vault.updateSecret(secretName, stored);
        }
        else {
            await this._vault.addSecret(secretName, stored);
        }
        const childIdentity = await CbioIdentity.load({ privateKey: keys.privateKey, publicKey }, {
            storage: opts.storage,
            storageKey: opts.storageKey ?? getVaultPath(publicKey),
            activityLogKey: opts.activityLogKey,
        });
        childIdentity.setIssuedIdentity(issuedIdentity);
        return {
            agentId,
            publicKey,
            secretName,
            agent: childIdentity.getAgent(opts.agentPermissions),
        };
    }
    async loadManagedAgent(publicKey, options) {
        const secretName = getChildIdentitySecretName(publicKey);
        const stored = this.getSecret(secretName);
        if (!stored) {
            throw new IdentityError(IdentityErrorCode.SECRET_NOT_FOUND, `Managed agent identity '${publicKey}' is not registered in this authority vault.`);
        }
        const parsed = JSON.parse(stored);
        if (!parsed.privateKey || !parsed.publicKey || !parsed.issuedIdentity) {
            throw new IdentityError(IdentityErrorCode.SECRET_NOT_FOUND, `Managed agent identity '${publicKey}' is malformed in authority vault.`);
        }
        // Verify protocol alignment
        if (!verifyIssuedAgentIdentity(parsed.issuedIdentity)) {
            throw new IdentityError(IdentityErrorCode.SECRET_NOT_FOUND, `Managed agent identity '${publicKey}' failed protocol verification.`);
        }
        const childIdentity = await CbioIdentity.load({ privateKey: parsed.privateKey, publicKey: parsed.publicKey }, {
            storage: options?.storage,
            storageKey: options?.storageKey ?? getVaultPath(parsed.publicKey),
            activityLogKey: options?.activityLogKey,
        });
        childIdentity.setIssuedIdentity(parsed.issuedIdentity);
        return {
            agentId: parsed.agentId ?? deriveRootAgentId(parsed.publicKey),
            publicKey: parsed.publicKey,
            secretName,
            agent: childIdentity.getAgent(),
        };
    }
    async registerChildIdentity(keys, options) {
        if (!keys.privateKey)
            throw new IdentityError(IdentityErrorCode.CHILD_IDENTITY_REQUIRES_PRIVATE_KEY, "Child identity requires privateKey.");
        if (!(this._identity.signer instanceof LocalSigner)) {
            throw new IdentityError(IdentityErrorCode.SIGNER_REQUIRES_PRIVATE_KEY, 'CbioIdentity must have a LocalSigner to register child identities (requires private key access for signing).');
        }
        const pub = keys.publicKey || derivePublicKey(keys.privateKey);
        const secretName = getChildIdentitySecretName(pub);
        const issuerPublicKey = await this._identity.getPublicKey();
        const unsignedIdentity = {
            cbio_protocol: 'v1.0',
            kind: 'issued_agent_identity',
            agent: createIdentityRef(pub),
            authority: createIdentityRef(issuerPublicKey),
            issuance: {
                issued_at: new Date().toISOString(),
                sequence: 1,
            },
            capabilities: options?.capabilities,
        };
        const issuedIdentity = signIssuedAgentIdentity(this._identity.signer.exportPrivateKey(), unsignedIdentity);
        const record = {
            agentId: deriveRootAgentId(pub),
            publicKey: pub,
            privateKey: keys.privateKey,
            issuedIdentity,
        };
        const stored = JSON.stringify(record);
        if (this._vault.hasSecret(secretName)) {
            await this._vault.updateSecret(secretName, stored);
        }
        else {
            await this._vault.addSecret(secretName, stored);
        }
        return secretName;
    }
}
//# sourceMappingURL=agent.js.map