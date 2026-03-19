import { Signer, KeyPair, derivePublicKey, LocalSigner, generateIdentityKeys } from "../protocol/crypto.js";
import { CbioVault, type MergeResult, type SecretPolicy } from "../vault/vault.js";
import { AuthClient, type FetchWithAuthOptions } from "../http/authClient.js";
import {
  SecretAcquisition,
  type FetchJsonAndAddSecretOptions,
  type FetchJsonAndUpdateSecretOptions,
  type FetchResult,
} from "../http/secretAcquisition.js";
import type { ActivityLogEntry, ActivityLogMetadata } from "../audit/ActivityLog.js";
import { getChildIdentitySecretName, deriveRootAgentId, getVaultPath } from "../protocol/identity.js";
import {
  createIdentityRef,
  signIssuedAgentIdentity,
  signRevocationRecord,
  verifyIssuedAgentIdentity,
  type IssuedAgentIdentity,
  type UnsignedIssuedAgentIdentity,
  type UnsignedRevocationRecord,
  type RevocationRecord,
} from "@the-ai-company/cbio-protocol";
import { IdentityError, IdentityErrorCode } from "../errors.js";
import type { IStorageProvider } from "../storage/provider.js";

const identityVaults = new WeakMap<CbioIdentity, CbioVault>();

interface ManagedAgentRecord {
  agentId: string;
  publicKey: string;
  privateKey: string;
  issuedIdentity: IssuedAgentIdentity;
}

export interface IdentityLoadKeys {
  privateKey: string;
  publicKey?: string;
}

export interface IdentityLoadOptions {
  storage?: IStorageProvider;
  storageKey?: string;
  activityLogKey?: string | null;
}

/**
 * Valid permission strings for a CbioAgent handle.
 */
export type AgentPermissionName =
  | "vault:list"
  | "vault:fetch"
  | "vault:acquire"
  | "admin:secrets"
  | "admin:issue"
  | "identity:sign";

/**
 * Granular permissions for a CbioAgent handle.
 * These are runtime switches that control access to specific facets.
 */
export type AgentPermissions = Partial<Record<AgentPermissionName, boolean>>;

export interface GetAgentOptions {
  /** Explicit runtime permissions for the returned handle. */
  permissions?: AgentPermissions;
  /** Derive runtime permissions from the issued identity's protocol capabilities. */
  deriveFromIssuedIdentity?: boolean;
}

/**
 * CbioIdentity
 *
 * The primary Identity container. Represents an agent's identity and its associated vault.
 * This is the high-privilege handle that contains administrative capabilities (.admin)
 * and private keys.
 */
export class CbioIdentity {
  public readonly admin: CbioManagementFacet;
  public readonly agentId: string;
  public readonly publicKey: string;
  #issuedIdentity?: IssuedAgentIdentity;

  private readonly _authClient: AuthClient;
  private readonly _secretAcquisition: SecretAcquisition;

  private constructor(
    public readonly signer: Signer,
    private readonly _vault: CbioVault,
    agentId?: string,
    publicKey?: string,
  ) {
    this.agentId = agentId || "";
    this.publicKey = publicKey || "";

    const appendLog = (entry: ActivityLogEntry) => this._vault.appendActivityLogEntry(entry);
    this._authClient = new AuthClient(this._vault, this.signer, appendLog);
    this._secretAcquisition = new SecretAcquisition(this._vault, appendLog);
    this.admin = new CbioManagementFacet(this, this._vault);
    identityVaults.set(this, this._vault);
  }

  /**
   * Primary entry point: Load identity from keys and initialize vault.
   */
  static async load(keys: IdentityLoadKeys, options?: IdentityLoadOptions): Promise<CbioIdentity> {
    const opts = options ?? {};
    const priv = keys.privateKey;
    const pub = keys.publicKey || derivePublicKey(priv);
    const agentId = deriveRootAgentId(pub);
    const signer = new LocalSigner({ publicKey: pub, privateKey: priv });
    const identity = new CbioIdentity(signer, new CbioVault(), agentId, pub);

    const storageKey = opts.storageKey ?? getVaultPath(pub);
    const activityLogKey =
      opts.activityLogKey === null
        ? undefined
        : (opts.activityLogKey ?? storageKey.replace(/\.enc$/, "") + ".activity.jsonl");
    await identity._vault.initFromStorage(signer, storageKey, opts.storage, activityLogKey);

    return identity;
  }

  async fetchWithAuth(secretName: string, url: string, options?: FetchWithAuthOptions): Promise<Response> {
    return this._authClient.fetchWithAuth(secretName, url, options ?? {});
  }

  createFetchWithAuth(secretName: string): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
    return this._authClient.createFetchWithAuth(secretName);
  }

  async getPublicKey(): Promise<string> {
    return this.publicKey || this.signer.getPublicKey();
  }

  async getAgentId(): Promise<string> {
    return this.agentId || deriveRootAgentId(await this.getPublicKey());
  }

  async fetchJsonAndAddSecret<TResponse = unknown, TBody = unknown>(
    options: FetchJsonAndAddSecretOptions<TResponse, TBody>,
  ): Promise<FetchResult<TResponse>> {
    return this._secretAcquisition.fetchJsonAndAddSecret(options);
  }

  async fetchJsonAndUpdateSecret<TResponse = unknown, TBody = unknown>(
    options: FetchJsonAndUpdateSecretOptions<TResponse, TBody>,
  ): Promise<FetchResult<TResponse>> {
    return this._secretAcquisition.fetchJsonAndUpdateSecret(options);
  }

  hasSecret(secretName: string): boolean {
    return this._vault.hasSecret(secretName);
  }

  listSecretNames(): string[] {
    return this._vault.listSecretNames();
  }

  /**
   * Register a newly created child identity to the parent vault.
   */
  async registerChildIdentity(keys: KeyPair, options?: RegisterChildIdentityOptions): Promise<string> {
    return this.admin.registerChildIdentity(keys, options);
  }

  async authenticate(nonce: string): Promise<string> {
    return this.signer.sign(nonce);
  }

  /**
   * Create a standard Agent handle for this identity.
   * The Agent handle DOES NOT have an .admin property and does not expose the signer/private key.
   * This is the recommended handle to pass to an autonomous LLM.
   *
   * By default this returns a minimally privileged handle (`vault:fetch`, `vault:list`).
   * Runtime permissions are only widened when passed explicitly or when
   * `deriveFromIssuedIdentity` is set to `true`.
   */
  getAgent(options?: GetAgentOptions): CbioAgent {
    const opts = options ?? {};
    let finalPerms = opts.permissions;

    if (!finalPerms && opts.deriveFromIssuedIdentity) {
      finalPerms = {};
      for (const cap of this.#issuedIdentity?.capabilities ?? []) {
        finalPerms[cap as AgentPermissionName] = true;
      }
      finalPerms["vault:fetch"] = true;
      finalPerms["vault:list"] = true;
    }

    return new CbioAgent(this._authClient, this._secretAcquisition, this.agentId, this.publicKey, finalPerms);
  }

  /**
   * @internal
   * Set the protocol-level identity certificate for this identity.
   */
  setIssuedIdentity(identity: IssuedAgentIdentity): void {
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
  #authClient: AuthClient;
  #secretAcquisition: SecretAcquisition;
  #permissions: AgentPermissions;

  constructor(
    authClient: AuthClient,
    secretAcquisition: SecretAcquisition,
    public readonly agentId: string,
    public readonly publicKey: string,
    permissions?: AgentPermissions,
  ) {
    this.#authClient = authClient;
    this.#secretAcquisition = secretAcquisition;
    // Default to a restricted worker (vault:fetch, vault:list) if no permissions specified
    this.#permissions = permissions || { "vault:fetch": true, "vault:list": true };
  }

  /**
   * View the runtime permissions granted to this handle.
   */
  get permissions(): Readonly<AgentPermissions> {
    return Object.freeze({ ...this.#permissions });
  }

  private _checkPermission(permission: AgentPermissionName): void {
    if (!this.#permissions[permission]) {
      throw new IdentityError(
        IdentityErrorCode.PERMISSION_DENIED,
        `Agent handle does not have '${permission}' permission.`,
      );
    }
  }

  async fetchWithAuth(secretName: string, url: string, options?: FetchWithAuthOptions): Promise<Response> {
    // vault:fetch is required for network auth
    this._checkPermission("vault:fetch");
    return this.#authClient.fetchWithAuth(secretName, url, options ?? {});
  }

  createFetchWithAuth(secretName: string): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
    this._checkPermission("vault:fetch");
    return this.#authClient.createFetchWithAuth(secretName);
  }

  async getPublicKey(): Promise<string> {
    return this.publicKey;
  }

  async getAgentId(): Promise<string> {
    return this.agentId;
  }

  async fetchJsonAndAddSecret<TResponse = unknown, TBody = unknown>(
    options: FetchJsonAndAddSecretOptions<TResponse, TBody>,
  ): Promise<FetchResult<TResponse>> {
    this._checkPermission("vault:acquire");
    return this.#secretAcquisition.fetchJsonAndAddSecret(options);
  }

  async fetchJsonAndUpdateSecret<TResponse = unknown, TBody = unknown>(
    options: FetchJsonAndUpdateSecretOptions<TResponse, TBody>,
  ): Promise<FetchResult<TResponse>> {
    this._checkPermission("vault:acquire");
    return this.#secretAcquisition.fetchJsonAndUpdateSecret(options);
  }

  hasSecret(secretName: string): boolean {
    this._checkPermission("vault:list");
    return this.#secretAcquisition.hasSecret(secretName);
  }

  listSecretNames(): string[] {
    this._checkPermission("vault:list");
    return this.#secretAcquisition.listSecretNames();
  }

  /**
   * Check if this agent handle has the specified runtime permission.
   */
  can(permission: AgentPermissionName): boolean {
    return !!this.#permissions[permission];
  }
}

export interface ManagedAgentContext {
  agentId: string;
  publicKey: string;
  identityRecordKey: string;
  agent: CbioAgent;
}

export interface RegisterChildIdentityOptions {
  /** Protocol-level capabilities embedded into the signed child identity. */
  issuedCapabilities?: AgentPermissionName[];
}

export interface ManagedAgentIssueOptions {
  keys?: KeyPair;
  secretName?: string;
  /** Protocol-level capabilities embedded into the signed managed identity. */
  issuedCapabilities?: AgentPermissionName[];
  /** Runtime permissions granted to the returned `CbioAgent` handle. */
  runtimePermissions?: AgentPermissions;
  storage?: IStorageProvider;
  storageKey?: string;
  activityLogKey?: string | null;
}

export interface ManagedAgentLoadOptions {
  /** Runtime permissions granted to the loaded `CbioAgent` handle. */
  runtimePermissions?: AgentPermissions;
  storage?: IStorageProvider;
  storageKey?: string;
  activityLogKey?: string | null;
}

/**
 * CbioManagementFacet
 *
 * Provides administrative (high-risk) capabilities for a CbioIdentity.
 */
export class CbioManagementFacet {
  constructor(
    private readonly _identity: CbioIdentity,
    private readonly _vault: CbioVault,
  ) {}

  async addSecret(secretName: string, secretValue: string, options?: SecretPolicy): Promise<void> {
    await this._vault.addSecret(secretName, secretValue, options);
  }

  getSecret(secretName: string): string | undefined {
    return this._vault.getSecret(secretName);
  }

  private _isManagedAgentRevoked(publicKey: string): boolean {
    const revocationKey = `cbio:revocation:${publicKey}`;
    return this._vault.hasSecret(revocationKey);
  }

  private _assertManagedAgentNotRevoked(publicKey: string): void {
    if (this._isManagedAgentRevoked(publicKey)) {
      throw new IdentityError(
        IdentityErrorCode.PERMISSION_DENIED,
        `Managed agent '${publicKey}' has been revoked and cannot be loaded.`
      );
    }
  }

  /**
   * Get the protocol-level capabilities granted to a managed agent.
   * Includes a check for revocation.
   */
  getManagedAgentCapabilities(publicKey: string): string[] {
    const secretName = getChildIdentitySecretName(publicKey);
    const stored = this.getSecret(secretName);
    if (!stored) return [];

    if (this._isManagedAgentRevoked(publicKey)) {
      return []; // Agent is revoked, return no capabilities
    }

    try {
      const parsed = JSON.parse(stored) as ManagedAgentRecord;
      return parsed.issuedIdentity.capabilities || [];
    } catch {
      return [];
    }
  }

  /**
   * Revoke a managed agent by issuing a protocol-level revocation record.
   */
  async revokeManagedAgent(publicKey: string, reason?: string): Promise<void> {
    const secretName = getChildIdentitySecretName(publicKey);
    if (!this._vault.hasSecret(secretName)) {
      throw new IdentityError(
        IdentityErrorCode.SECRET_NOT_FOUND,
        `Managed agent with public key '${publicKey}' not found in this vault.`,
      );
    }

    if (!(this._identity.signer instanceof LocalSigner)) {
      throw new IdentityError(
        IdentityErrorCode.SIGNER_REQUIRES_PRIVATE_KEY,
        "Authority must have a LocalSigner to sign revocation records.",
      );
    }

    const issuerPublicKey = await this._identity.getPublicKey();
    const unsignedRevocation: UnsignedRevocationRecord = {
      cbio_protocol: "v1.0",
      kind: "revocation_record",
      issuer: createIdentityRef(issuerPublicKey),
      target: {
        kind: "issued_agent_identity",
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

  hasSecret(secretName: string): boolean {
    return this._vault.hasSecret(secretName);
  }

  async deleteSecret(secretName: string): Promise<void> {
    await this._vault.deleteSecret(secretName);
  }

  async setSecretAllowedOrigins(secretName: string, allowedOrigins: readonly string[]): Promise<void> {
    await this._vault.setSecretAllowedOrigins(secretName, allowedOrigins);
  }

  async getActivityLog(): Promise<readonly ActivityLogEntry[]> {
    return this._vault.getActivityLog();
  }

  async getActivityLogMetadata(): Promise<ActivityLogMetadata | null> {
    return this._vault.getActivityLogMetadata();
  }

  async mergeFrom(
    otherIdentity: CbioIdentity,
    options?: { onConflict?: "abort" | "skip" | "overwrite" },
  ): Promise<MergeResult> {
    const otherVault = identityVaults.get(otherIdentity);
    if (!otherVault) {
      throw new IdentityError(
        IdentityErrorCode.MERGE_IDENTITY_MISMATCH,
        "The source identity is not bound to a mergeable vault instance.",
      );
    }
    return this._vault.mergeFrom(otherVault, options);
  }

  seal(kdk: string): string {
    return this._vault.seal(kdk);
  }

  loadFromSealedBlob(kdk: string, sealedBlob: string): void {
    this._vault.unseal(kdk, sealedBlob);
  }

  async serializeToBlob(): Promise<string> {
    return this._vault.serializeToBlob(this._identity.signer);
  }

  async saveVault(): Promise<void> {
    await this._vault.save(this._identity.signer);
  }

  async saveVaultAs(storageKey: string): Promise<void> {
    await this._vault.save(this._identity.signer, storageKey);
  }

  async issueManagedAgent(options?: ManagedAgentIssueOptions): Promise<ManagedAgentContext> {
    const opts = options ?? {};
    const keys = opts.keys ?? generateIdentityKeys();
    const publicKey = keys.publicKey || derivePublicKey(keys.privateKey);
    const agentId = deriveRootAgentId(publicKey);
    const secretName = opts.secretName ?? getChildIdentitySecretName(publicKey);

    if (!(this._identity.signer instanceof LocalSigner)) {
      throw new IdentityError(
        IdentityErrorCode.SIGNER_REQUIRES_PRIVATE_KEY,
        "CbioIdentity must have a LocalSigner to issue managed agents (requires private key access for signing).",
      );
    }

    const issuerPublicKey = await this._identity.getPublicKey();

    const unsignedIdentity: UnsignedIssuedAgentIdentity = {
      cbio_protocol: "v1.0",
      kind: "issued_agent_identity",
      agent: createIdentityRef(publicKey),
      authority: createIdentityRef(issuerPublicKey),
      issuance: {
        issued_at: new Date().toISOString(),
        sequence: 1,
      },
      capabilities: opts.issuedCapabilities,
    };

    const issuedIdentity = signIssuedAgentIdentity(this._identity.signer.exportPrivateKey(), unsignedIdentity);

    const record: ManagedAgentRecord = {
      agentId,
      publicKey,
      privateKey: keys.privateKey,
      issuedIdentity,
    };
    const stored = JSON.stringify(record);
    if (this._vault.hasSecret(secretName)) {
      await this._vault.updateSecret(secretName, stored);
    } else {
      await this._vault.addSecret(secretName, stored);
    }

    const childIdentity = await CbioIdentity.load(
      { privateKey: keys.privateKey, publicKey },
      {
        storage: opts.storage,
        storageKey: opts.storageKey ?? getVaultPath(publicKey),
        activityLogKey: opts.activityLogKey,
      },
    );
    childIdentity.setIssuedIdentity(issuedIdentity);
    return {
      agentId,
      publicKey,
      identityRecordKey: secretName,
      agent: childIdentity.getAgent({ permissions: opts.runtimePermissions }),
    };
  }

  async loadManagedAgent(publicKey: string, options?: ManagedAgentLoadOptions): Promise<ManagedAgentContext> {
    this._assertManagedAgentNotRevoked(publicKey);
    const secretName = getChildIdentitySecretName(publicKey);
    const stored = this.getSecret(secretName);
    if (!stored) {
      throw new IdentityError(
        IdentityErrorCode.SECRET_NOT_FOUND,
        `Managed agent identity '${publicKey}' is not registered in this authority vault.`,
      );
    }

    const parsed = JSON.parse(stored) as Partial<ManagedAgentRecord>;
    if (!parsed.privateKey || !parsed.publicKey || !parsed.issuedIdentity) {
      throw new IdentityError(
        IdentityErrorCode.SECRET_NOT_FOUND,
        `Managed agent identity '${publicKey}' is malformed in authority vault.`,
      );
    }

    // Verify protocol alignment
    if (!verifyIssuedAgentIdentity(parsed.issuedIdentity)) {
      throw new IdentityError(
        IdentityErrorCode.SECRET_NOT_FOUND,
        `Managed agent identity '${publicKey}' failed protocol verification.`,
      );
    }

    const childIdentity = await CbioIdentity.load(
      { privateKey: parsed.privateKey, publicKey: parsed.publicKey },
      {
        storage: options?.storage,
        storageKey: options?.storageKey ?? getVaultPath(parsed.publicKey),
        activityLogKey: options?.activityLogKey,
      },
    );
    childIdentity.setIssuedIdentity(parsed.issuedIdentity);
    return {
      agentId: parsed.agentId ?? deriveRootAgentId(parsed.publicKey),
      publicKey: parsed.publicKey,
      identityRecordKey: secretName,
      agent: childIdentity.getAgent({ permissions: options?.runtimePermissions }),
    };
  }

  async registerChildIdentity(keys: KeyPair, options?: RegisterChildIdentityOptions): Promise<string> {
    if (!keys.privateKey)
      throw new IdentityError(
        IdentityErrorCode.CHILD_IDENTITY_REQUIRES_PRIVATE_KEY,
        "Child identity requires privateKey.",
      );

    if (!(this._identity.signer instanceof LocalSigner)) {
      throw new IdentityError(
        IdentityErrorCode.SIGNER_REQUIRES_PRIVATE_KEY,
        "CbioIdentity must have a LocalSigner to register child identities (requires private key access for signing).",
      );
    }

    const pub = keys.publicKey || derivePublicKey(keys.privateKey);
    const secretName = getChildIdentitySecretName(pub);

    const issuerPublicKey = await this._identity.getPublicKey();
    const unsignedIdentity: UnsignedIssuedAgentIdentity = {
      cbio_protocol: "v1.0",
      kind: "issued_agent_identity",
      agent: createIdentityRef(pub),
      authority: createIdentityRef(issuerPublicKey),
      issuance: {
        issued_at: new Date().toISOString(),
        sequence: 1,
      },
      capabilities: options?.issuedCapabilities,
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
    } else {
      await this._vault.addSecret(secretName, stored);
    }
    return secretName;
  }
}
