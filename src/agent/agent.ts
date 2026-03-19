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
  verifyRevocationRecord,
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
 * Protocol-level capability strings embedded into signed identities.
 */
export type IssuedCapabilityName =
  | "vault:list"
  | "vault:fetch"
  | "vault:acquire"
  | "admin:secrets"
  | "admin:issue"
  | "identity:sign";

/**
 * Valid runtime permission strings for a CbioAgent handle.
 */
export type RuntimePermissionName =
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
export type RuntimePermissions = Partial<Record<RuntimePermissionName, boolean>>;

function capabilityToRuntimePermission(capability: IssuedCapabilityName): RuntimePermissionName {
  return capability;
}

export interface GetAgentOptions {
  /** Explicit runtime permissions for the returned handle. */
  permissions?: RuntimePermissions;
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
  public readonly admin: CbioAdmin;
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
    this.admin = new CbioAdmin(this, this._vault);
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
    return this.admin.children.registerChildIdentity(keys, options);
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
        finalPerms[capabilityToRuntimePermission(cap as IssuedCapabilityName)] = true;
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
  #permissions: RuntimePermissions;

  constructor(
    authClient: AuthClient,
    secretAcquisition: SecretAcquisition,
    public readonly agentId: string,
    public readonly publicKey: string,
    permissions?: RuntimePermissions,
  ) {
    this.#authClient = authClient;
    this.#secretAcquisition = secretAcquisition;
    // Default to a restricted worker (vault:fetch, vault:list) if no permissions specified
    this.#permissions = permissions || { "vault:fetch": true, "vault:list": true };
  }

  /**
   * View the runtime permissions granted to this handle.
   */
  get permissions(): Readonly<RuntimePermissions> {
    return Object.freeze({ ...this.#permissions });
  }

  private _checkPermission(permission: RuntimePermissionName): void {
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
  can(permission: RuntimePermissionName): boolean {
    return !!this.#permissions[permission];
  }
}

export interface ManagedAgentContext {
  agentId: string;
  publicKey: string;
  agent: CbioAgent;
}

export interface RegisterChildIdentityOptions {
  /** Protocol-level capabilities embedded into the signed child identity. */
  issuedCapabilities?: IssuedCapabilityName[];
}

export interface ManagedAgentIssueConfig {
  keys?: KeyPair;
  secretName?: string;
  /** Protocol-level capabilities embedded into the signed managed identity. */
  issuedCapabilities?: IssuedCapabilityName[];
}

export interface ManagedAgentHandleConfig {
  /** Runtime permissions granted to the returned `CbioAgent` handle. */
  runtimePermissions?: RuntimePermissions;
}

export interface ManagedAgentStorageConfig {
  storage?: IStorageProvider;
  storageKey?: string;
  activityLogKey?: string | null;
}

export interface ManagedAgentIssueOptions {
  issue?: ManagedAgentIssueConfig;
  handle?: ManagedAgentHandleConfig;
  storage?: ManagedAgentStorageConfig;
}

export interface ManagedAgentLoadOptions {
  /** Runtime permissions granted to the loaded `CbioAgent` handle. */
  runtimePermissions?: RuntimePermissions;
  storage?: IStorageProvider;
  storageKey?: string;
  activityLogKey?: string | null;
}

/**
 * CbioManagementFacet
 *
 * Provides administrative (high-risk) capabilities for a CbioIdentity.
 */
class ManagedAgentSupport {
  constructor(
    protected readonly _identity: CbioIdentity,
    protected readonly _vault: CbioVault,
  ) {}

  protected getSecret(secretName: string): string | undefined {
    return this._vault.getSecret(secretName);
  }

  async addSecret(secretName: string, secretValue: string, options?: SecretPolicy): Promise<void> {
    await this._vault.addSecret(secretName, secretValue, options);
  }

  protected _getManagedAgentRecord(publicKey: string): ManagedAgentRecord | null {
    const secretName = getChildIdentitySecretName(publicKey);
    const stored = this.getSecret(secretName);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as ManagedAgentRecord;
      return parsed;
    } catch {
      return null;
    }
  }

  protected _getManagedAgentRevocation(publicKey: string): RevocationRecord | null {
    const revocationKey = `cbio:revocation:${publicKey}`;
    const stored = this.getSecret(revocationKey);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored) as RevocationRecord;
      if (!verifyRevocationRecord(parsed)) return null;
      if (parsed.issuer.public_key !== this._identity.publicKey) return null;
      if (parsed.issuer.agent_id !== this._identity.agentId) return null;
      if (parsed.target.kind !== "issued_agent_identity") return null;
      if (parsed.target.subject_agent_id !== deriveRootAgentId(publicKey)) return null;

      const record = this._getManagedAgentRecord(publicKey);
      const expectedSequence = record?.issuedIdentity?.issuance?.sequence;
      if (expectedSequence !== undefined && parsed.target.sequence !== expectedSequence) return null;

      return parsed;
    } catch {
      return null;
    }
  }

  protected _isManagedAgentRevoked(publicKey: string): boolean {
    return this._getManagedAgentRevocation(publicKey) !== null;
  }

  protected _assertManagedAgentNotRevoked(publicKey: string): void {
    if (this._isManagedAgentRevoked(publicKey)) {
      throw new IdentityError(
        IdentityErrorCode.PERMISSION_DENIED,
        `Managed agent '${publicKey}' has been revoked and cannot be loaded.`
      );
    }
  }
}

export class CbioVaultAdmin {
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
}

export class CbioManagedAgentAdmin extends ManagedAgentSupport {
  getManagedAgentCapabilities(publicKey: string): string[] {
    const record = this._getManagedAgentRecord(publicKey);
    if (!record) return [];

    if (this._isManagedAgentRevoked(publicKey)) {
      return []; // Agent is revoked, return no capabilities
    }

    return record.issuedIdentity.capabilities || [];
  }

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
    const managedRecord = this._getManagedAgentRecord(publicKey);
    const targetSequence = managedRecord?.issuedIdentity?.issuance?.sequence ?? 1;
    const unsignedRevocation: UnsignedRevocationRecord = {
      cbio_protocol: "v1.0",
      kind: "revocation_record",
      issuer: createIdentityRef(issuerPublicKey),
      target: {
        kind: "issued_agent_identity",
        subject_agent_id: deriveRootAgentId(publicKey),
        sequence: targetSequence,
      },
      revocation: {
        revoked_at: new Date().toISOString(),
        reason,
      },
    };

    const signedRevocation = signRevocationRecord(this._identity.signer.exportPrivateKey(), unsignedRevocation);

    // Store the revocation record
    const revocationKey = `cbio:revocation:${publicKey}`;
    await this._vault.addSecret(revocationKey, JSON.stringify(signedRevocation));
  }

  async issueManagedAgent(options?: ManagedAgentIssueOptions): Promise<ManagedAgentContext> {
    const opts = options ?? {};
    const issue = opts.issue ?? {};
    const handle = opts.handle ?? {};
    const storage = opts.storage ?? {};
    const keys = issue.keys ?? generateIdentityKeys();
    const publicKey = keys.publicKey || derivePublicKey(keys.privateKey);
    const agentId = deriveRootAgentId(publicKey);
    const secretName = issue.secretName ?? getChildIdentitySecretName(publicKey);

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
      capabilities: issue.issuedCapabilities,
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
        storage: storage.storage,
        storageKey: storage.storageKey ?? getVaultPath(publicKey),
        activityLogKey: storage.activityLogKey,
      },
    );
    childIdentity.setIssuedIdentity(issuedIdentity);
    return {
      agentId,
      publicKey,
      agent: childIdentity.getAgent({ permissions: handle.runtimePermissions }),
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

    const derivedPublicKey = derivePublicKey(parsed.privateKey);
    const derivedAgentId = deriveRootAgentId(parsed.publicKey);
    const authorityPublicKey = await this._identity.getPublicKey();
    const authorityAgentId = await this._identity.getAgentId();
    const issuedPublicKey = parsed.issuedIdentity.agent?.public_key;
    const issuedAgentId = parsed.issuedIdentity.agent?.agent_id;
    const issuedAuthorityPublicKey = parsed.issuedIdentity.authority?.public_key;
    const issuedAuthorityAgentId = parsed.issuedIdentity.authority?.agent_id;

    if (parsed.publicKey !== publicKey) {
      throw new IdentityError(
        IdentityErrorCode.SECRET_NOT_FOUND,
        `Managed agent identity '${publicKey}' record publicKey does not match requested public key.`,
      );
    }

    if (derivedPublicKey !== parsed.publicKey) {
      throw new IdentityError(
        IdentityErrorCode.SECRET_NOT_FOUND,
        `Managed agent identity '${publicKey}' contains a privateKey/publicKey mismatch.`,
      );
    }

    if ((parsed.agentId ?? derivedAgentId) !== derivedAgentId) {
      throw new IdentityError(
        IdentityErrorCode.SECRET_NOT_FOUND,
        `Managed agent identity '${publicKey}' contains an invalid agentId.`,
      );
    }

    if (issuedPublicKey !== parsed.publicKey) {
      throw new IdentityError(
        IdentityErrorCode.SECRET_NOT_FOUND,
        `Managed agent identity '${publicKey}' issuedIdentity public_key does not match record publicKey.`,
      );
    }

    if (issuedAgentId !== derivedAgentId) {
      throw new IdentityError(
        IdentityErrorCode.SECRET_NOT_FOUND,
        `Managed agent identity '${publicKey}' issuedIdentity agent_id does not match record agentId.`,
      );
    }

    if (issuedAuthorityPublicKey !== authorityPublicKey) {
      throw new IdentityError(
        IdentityErrorCode.SECRET_NOT_FOUND,
        `Managed agent identity '${publicKey}' issuedIdentity authority public_key does not match this authority.`,
      );
    }

    if (issuedAuthorityAgentId !== authorityAgentId) {
      throw new IdentityError(
        IdentityErrorCode.SECRET_NOT_FOUND,
        `Managed agent identity '${publicKey}' issuedIdentity authority agent_id does not match this authority.`,
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
      agent: childIdentity.getAgent({ permissions: options?.runtimePermissions }),
    };
  }
}

export class CbioChildIdentityAdmin {
  constructor(
    private readonly _identity: CbioIdentity,
    private readonly _vault: CbioVault,
  ) {}

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

export class CbioAdmin {
  public readonly vault: CbioVaultAdmin;
  public readonly managedAgents: CbioManagedAgentAdmin;
  public readonly children: CbioChildIdentityAdmin;

  constructor(identity: CbioIdentity, vault: CbioVault) {
    this.vault = new CbioVaultAdmin(identity, vault);
    this.managedAgents = new CbioManagedAgentAdmin(identity, vault);
    this.children = new CbioChildIdentityAdmin(identity, vault);
  }
}
