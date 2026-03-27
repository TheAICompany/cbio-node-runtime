import { LocalSigner } from "../../protocol/crypto.js";
import { OwnerClientError, OwnerClientErrorCode } from "../../errors.js";
import {
  createAgentIdValue,
  createCapabilityIdValue,
  createFlowIdValue,
  createRequestIdValue,
} from "../../internal/id-factory.js";
import { createIdentity, restoreIdentity, type CreatedIdentity } from "../../runtime/identity.js";
import { SystemClock, type Clock } from "../../vault-core/index.js";
import type { VaultService } from "../../vault-ingress/index.js";
import type {
  VaultAuditQueryInput,
  VaultExportSecretInput,
  VaultReadSecretPlaintextInput,
  VaultReadAgentPrivateKeyInput,
  VaultGrantCapabilityInput,
  OwnerGrantCapabilityInput,
  VaultRegisterFlowInput,
  VaultImportAgentInput,
  VaultCreateAgentInput,
  OwnerAgentProvisionResult,
  OwnerCreateSecretInput,
  OwnerUpdateSecretInput,
  OwnerRemoveSecretInput,
  VaultUpdateAgentInput,
  VaultListAgentsInput,
  VaultListCapabilitiesInput,
  VaultListRequestsInput,
  VaultGetRequestInput,
  VaultListCapabilityStatesInput,
  VaultListSecretsInput,
  VaultRevokeCapabilityInput,
  VaultIssueSessionTokenInput,
  VaultRevokeSessionTokenInput,
  VaultSubmitCapabilityRequestInput,
  VaultApproveCapabilityRequestInput,
  OwnerSensitiveActionConfirmation,
  OwnerSensitiveActionContext,
} from "./contracts.js";

export interface VaultIdentity {
  identityId: string;
}

export interface VaultSigner {
  sign(input: string): Promise<string>;
}

/**
 * A client for vault owners to manage secrets, agents, and capabilities.
 * In Sovereign Vault model, administrative actions are implicitly authorized by the working key.
 */
export interface VaultClient {
  /**
   * Inserts a new active secret into the vault.
   */
  ownerCreateSecret(input: OwnerCreateSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;

  /**
   * Inserts a new successor secret and marks the previous active version as superseded.
   */
  ownerUpdateSecret(input: OwnerUpdateSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;

  /**
   * Exports a secret's plaintext.
   */
  ownerExportSecret(input: VaultExportSecretInput): Promise<import("../../vault-core/index.js").OwnerSecretExport>;
  ownerReadSecretPlaintext(input: VaultReadSecretPlaintextInput): Promise<string>;
  ownerReadAgentPrivateKey(input: VaultReadAgentPrivateKeyInput): Promise<string>;

  /**
   * Grants a specific capability to an agent.
   */
  ownerGrantCapability(input: OwnerGrantCapabilityInput): Promise<import("../../vault-core/index.js").AgentCapability>;

  /**
   * Reads the tamper-evident audit log for the vault.
   */
  ownerReadAudit(query?: VaultAuditQueryInput): Promise<readonly import("../../vault-core/index.js").AuditEntry[]>;

  ownerImportAgent(input: VaultImportAgentInput): Promise<OwnerAgentProvisionResult>;

  /**
   * Generates a new identity and registers it as an agent in one step.
   * The private key is stored in the vault for managed custody.
   */
  ownerCreateAgent(input: VaultCreateAgentInput): Promise<OwnerAgentProvisionResult>;
  ownerUpdateAgent(input: VaultUpdateAgentInput): Promise<import("../../vault-core/index.js").AgentIdentityRecord>;

  /**
   * Registers a reusable HTTP request template for complex secret exchange patterns.
   */
  ownerRegisterFlow(input: VaultRegisterFlowInput): Promise<import("../../vault-core/index.js").CustomHttpFlowDefinition>;

  /**
   * Logically removes the current active secret.
   */
  ownerRemoveSecret(input: OwnerRemoveSecretInput): Promise<void>;

  /**
   * Lists all agents registered in the vault.
   */
  ownerListAgents(input?: VaultListAgentsInput): Promise<readonly import("../../vault-core/index.js").AgentIdentityRecord[]>;

  /**
   * Lists all active capabilities granted to agents.
   */
  ownerListCapabilities(input?: VaultListCapabilitiesInput): Promise<readonly import("../../vault-core/index.js").AgentCapability[]>;
  ownerListRequests(input?: VaultListRequestsInput): Promise<readonly import("../../vault-core/index.js").OwnerVisibleRequestRecord[]>;
  ownerGetRequest(input: VaultGetRequestInput): Promise<import("../../vault-core/index.js").OwnerRequestRecord>;
  ownerListCapabilityStates(input?: VaultListCapabilityStatesInput): Promise<readonly import("../../vault-core/index.js").CapabilityStateRecord[]>;
  ownerListSecrets(input?: VaultListSecretsInput): Promise<readonly import("../../vault-core/index.js").AgentVisibleSecretRecord[]>;

  /**
   * Revokes a previously granted capability.
   */
  ownerRevokeCapability(input: VaultRevokeCapabilityInput): Promise<void>;
  ownerIssueSessionToken(input: VaultIssueSessionTokenInput): Promise<import("../../vault-core/index.js").OwnerSessionToken>;
  ownerIssueAllSessionTokens(): Promise<readonly import("../../vault-core/index.js").OwnerSessionToken[]>;
  ownerRevokeSessionToken(input: VaultRevokeSessionTokenInput): Promise<void>;

  ownerSubmitCapabilityRequest(input: VaultSubmitCapabilityRequestInput): Promise<import("../../vault-core/index.js").CapabilityStateRecord>;
  ownerApproveCapabilityRead(input: VaultApproveCapabilityRequestInput): Promise<import("../../vault-core/index.js").CapabilityStateRecord>;
  ownerAllowOnce(input: VaultApproveCapabilityRequestInput): Promise<import("../../vault-core/index.js").DispatchResult>;
  ownerAllowAlways(input: VaultApproveCapabilityRequestInput): Promise<import("../../vault-core/index.js").DispatchResult>;
  ownerDeny(requestId: string): Promise<import("../../vault-core/index.js").CapabilityStateRecord>;
  ownerOnCapabilityState(callback: (record: import("../../vault-core/index.js").CapabilityStateRecord) => void): () => void;
}

export interface CreateVaultClientOptions {
  vault: VaultService;
  ownerIdentity?: CreatedIdentity | VaultIdentity;
  signer?: VaultSigner;
  clock?: Clock;
  skipWarmup?: boolean;
  passwordVerifier?: (password: string) => Promise<boolean> | boolean;
  sensitiveActionVerifier?: (
    confirmation: OwnerSensitiveActionConfirmation,
    context: OwnerSensitiveActionContext,
  ) => Promise<boolean> | boolean;
}

const VAULT_MASTER_ID = "vault-master";

class DefaultVaultClient implements VaultClient {
  private readonly _identityId: string;

  constructor(
    private readonly _vault: VaultService,
    private readonly _identity?: VaultIdentity,
    private readonly _signer?: VaultSigner,
    private readonly _clock: Clock = new SystemClock(),
    private readonly _skipWarmup: boolean = false,
    private readonly _passwordVerifier?: (password: string) => Promise<boolean> | boolean,
    private readonly _sensitiveActionVerifier?: (
      confirmation: OwnerSensitiveActionConfirmation,
      context: OwnerSensitiveActionContext,
    ) => Promise<boolean> | boolean,
  ) {
    this._identityId = _identity?.identityId ?? VAULT_MASTER_ID;
  }

  private async _confirmSensitiveAction(
    confirmation: OwnerSensitiveActionConfirmation,
    context: OwnerSensitiveActionContext,
  ): Promise<void> {
    const normalizedPassword = confirmation.password.trim();
    if (!normalizedPassword) {
      throw new OwnerClientError(
        OwnerClientErrorCode.SENSITIVE_ACTION_PASSWORD_REQUIRED,
        "owner password is required",
      );
    }
    if (this._sensitiveActionVerifier) {
      const valid = await this._sensitiveActionVerifier({
        password: normalizedPassword,
        verificationCode: confirmation.verificationCode,
      }, context);
      if (!valid) {
        throw new OwnerClientError(
          OwnerClientErrorCode.SENSITIVE_ACTION_REJECTED,
          "sensitive action confirmation rejected",
        );
      }
      return;
    }
    if (!this._passwordVerifier) {
      throw new OwnerClientError(
        OwnerClientErrorCode.SENSITIVE_ACTION_VERIFIER_REQUIRED,
        "VaultClient: sensitiveActionVerifier or passwordVerifier is required for sensitive reads",
      );
    }
    const valid = await this._passwordVerifier(normalizedPassword);
    if (!valid) {
      throw new OwnerClientError(
        OwnerClientErrorCode.SENSITIVE_ACTION_INVALID_PASSWORD,
        "invalid vault password",
      );
    }
  }

  private _resolveGrantedCapability(input: OwnerGrantCapabilityInput): {
    requestedAt?: string;
    capability: {
      vaultId?: import("../../vault-core/index.js").VaultId;
      capabilityId?: string;
      agentId: string;
      operation?: "dispatch_http" | "custom_http" | string;
      customFlowId?: string;
      write: import("../../vault-core/index.js").CapabilityWritePolicy;
      read: import("../../vault-core/index.js").CapabilityReadPolicy;
      issuedAt?: string;
      expiresAt?: string;
      rateLimit?: {
        maxRequests: number;
        windowMs: number;
      };
      skipAudit?: boolean;
      auditRequired?: boolean;
    };
  } {
    if ("capability" in input) {
      return {
        requestedAt: input.requestedAt ?? input.capability.issuedAt,
        capability: {
          vaultId: input.capability.vaultId,
          capabilityId: input.capability.capabilityId,
          agentId: input.capability.agentId,
          operation: input.capability.operation,
          customFlowId: input.capability.customFlowId,
          write: input.capability.write,
          read: input.capability.read,
          issuedAt: input.capability.issuedAt,
          expiresAt: input.capability.expiresAt,
          rateLimit: input.capability.rateLimit,
          skipAudit: input.capability.skipAudit,
          auditRequired: input.capability.auditRequired,
        },
      };
    }
    return {
      requestedAt: input.requestedAt,
      capability: input,
    };
  }

  async ownerCreateSecret(input: OwnerCreateSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("create_secret");
    
    return this._vault.ownerCreateSecret({
      kind: "owner.create_secret",
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      alias: input.alias,
      plaintext: input.plaintext,
      source: { kind: "manual" },
      requestedAt,
    });
  }

  async ownerUpdateSecret(input: OwnerUpdateSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("update_secret");
    
    return this._vault.ownerUpdateSecret({
      kind: "owner.update_secret",
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      alias: input.alias,
      plaintext: input.plaintext,
      source: { kind: "manual" },
      requestedAt,
    });
  }

  async ownerReadAudit(query: VaultAuditQueryInput = {}) {
    const requestedAt = this._clock.nowIso();
    const requestId = createRequestIdValue("read_audit");
    
    return this._vault.ownerReadAudit({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
      query,
      requestId,
      requestedAt,
    });
  }

  async ownerExportSecret(input: VaultExportSecretInput) {
    await this._confirmSensitiveAction({
      password: input.password,
      verificationCode: input.verificationCode,
    }, {
      action: "export_secret",
      subject: input.alias,
    });
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("export_secret");
    
    return this._vault.ownerExportSecret({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
      alias: input.alias,
      requestId,
      requestedAt,
    });
  }

  async ownerReadSecretPlaintext(input: VaultReadSecretPlaintextInput): Promise<string> {
    await this._confirmSensitiveAction({
      password: input.password,
      verificationCode: input.verificationCode,
    }, {
      action: "read_secret_plaintext",
      subject: input.alias,
    });
    const exported = await this._vault.ownerExportSecret({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
      alias: input.alias,
      requestId: createRequestIdValue("read_secret_plaintext"),
      requestedAt: input.requestedAt ?? this._clock.nowIso(),
    });
    return exported.plaintext;
  }

  async ownerReadAgentPrivateKey(input: VaultReadAgentPrivateKeyInput): Promise<string> {
    await this._confirmSensitiveAction({
      password: input.password,
      verificationCode: input.verificationCode,
    }, {
      action: "read_agent_private_key",
      subject: input.agentId,
    });
    const agents = await this._vault.ownerListAgents({
      vaultId: this._vault.vaultId,
      requestId: createRequestIdValue("read_agent_private_key"),
      requestedAt: input.requestedAt ?? this._clock.nowIso(),
      actor: {
        kind: "owner",
        id: this._identityId,
      },
    });
    const agent = agents.find((record) => record.agentId === input.agentId);
    if (!agent?.privateKey) {
      throw new OwnerClientError(
        OwnerClientErrorCode.AGENT_PRIVATE_KEY_NOT_FOUND,
        "agent private key not found",
      );
    }
    return agent.privateKey;
  }

  private async _ownerRegisterManagedAgentIdentity(input: {
    agentId: string;
    identityId: string;
    publicKey: string;
    privateKey?: string;
    metadata?: Record<string, any>;
    nickname?: string;
    requestedAt?: string;
  }): Promise<import("../../vault-core/index.js").AgentIdentityRecord> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("register_agent_identity");
    const agentIdentity = {
      vaultId: this._vault.vaultId,
      agentId: input.agentId,
      identityId: input.identityId,
      publicKey: input.publicKey,
      privateKey: input.privateKey,
      metadata: input.metadata,
      nickname: input.nickname,
    };
    
    await this._vault.ownerRegisterAgentIdentity({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      agentIdentity,
      requestedAt,
    });
    return agentIdentity;
  }

  async ownerImportAgent(input: VaultImportAgentInput): Promise<OwnerAgentProvisionResult> {
    const identity = restoreIdentity(input.privateKey, { nickname: input.nickname });
    const agent = await this._ownerRegisterManagedAgentIdentity({
      agentId: createAgentIdValue(),
      identityId: identity.identityId,
      publicKey: identity.publicKey,
      privateKey: identity.privateKey,
      metadata: input.metadata,
      nickname: input.nickname,
      requestedAt: input.requestedAt,
    });
    const sessionToken = await this.ownerIssueSessionToken({
      agentId: agent.agentId,
      requestedAt: input.requestedAt,
    });
    return {
      agent: {
        ...agent,
        privateKey: undefined,
      },
      sessionToken,
    };
  }

  async ownerCreateAgent(input: VaultCreateAgentInput): Promise<OwnerAgentProvisionResult> {
    const identity = createIdentity();
    const agent = await this._ownerRegisterManagedAgentIdentity({
      agentId: createAgentIdValue(),
      identityId: identity.identityId,
      publicKey: identity.publicKey,
      privateKey: identity.privateKey,
      metadata: input.metadata,
      nickname: input.nickname,
      requestedAt: input.requestedAt,
    });
    const sessionToken = await this.ownerIssueSessionToken({
      agentId: agent.agentId,
      requestedAt: input.requestedAt,
    });
    return {
      agent: {
        ...agent,
        privateKey: undefined,
      },
      sessionToken,
    };
  }

  async ownerUpdateAgent(input: VaultUpdateAgentInput): Promise<import("../../vault-core/index.js").AgentIdentityRecord> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("update_agent_identity");
    const updated = await this._vault.ownerUpdateAgentIdentity({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      agentId: input.agentId,
      nickname: input.nickname,
      metadata: input.metadata,
      requestedAt,
    });
    return {
      ...updated,
      privateKey: undefined,
    };
  }

  async ownerGrantCapability(input: OwnerGrantCapabilityInput): Promise<import("../../vault-core/index.js").AgentCapability> {
    const normalized = this._resolveGrantedCapability(input);
    const requestedAt = normalized.requestedAt ?? this._clock.nowIso();
    const capabilityId = normalized.capability.capabilityId ?? createCapabilityIdValue();
    const requestId = createRequestIdValue("register_capability");
    const skipAudit = normalized.capability.skipAudit ?? (
      normalized.capability.auditRequired === undefined
        ? undefined
        : !normalized.capability.auditRequired
    );
    
    const capability: import("../../vault-core/index.js").AgentCapability = {
      vaultId: normalized.capability.vaultId ?? this._vault.vaultId,
      agentId: normalized.capability.agentId,
      capabilityId,
      operation: (normalized.capability.operation as any) ?? "dispatch_http",
      customFlowId: normalized.capability.customFlowId,
      write: {
        secretIds: normalized.capability.write.secretIds ? [...normalized.capability.write.secretIds] : undefined,
        scope: normalized.capability.write.scope,
        methods: [...normalized.capability.write.methods],
      },
      read: { paths: [...normalized.capability.read.paths] },
      expiresAt: normalized.capability.expiresAt,
      rateLimit: normalized.capability.rateLimit,
      skipAudit,
      issuedAt: normalized.capability.issuedAt ?? requestedAt,
    };
    
    await this._vault.ownerRegisterCapability({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      capability,
      requestedAt,
    });
    return capability;
  }

  async ownerRegisterFlow(input: VaultRegisterFlowInput): Promise<import("../../vault-core/index.js").CustomHttpFlowDefinition> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const flowId = createFlowIdValue();
    const requestId = createRequestIdValue("register_custom_flow");
    const flow = {
      flowId,
      mode: input.mode,
      targetUrl: input.targetUrl,
      method: input.method,
      responseVisibility: input.responseVisibility,
      responseSecret: input.responseSecret,
    };
    
    await this._vault.ownerRegisterCustomFlow({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      flow,
      requestedAt,
    });
    return {
      vaultId: this._vault.vaultId,
      flowId,
      ownerId: this._identityId,
      mode: input.mode,
      targetUrl: input.targetUrl,
      method: input.method,
      responseVisibility: input.responseVisibility,
      responseSecret: input.responseSecret,
      createdAt: requestedAt,
    };
  }

  async ownerRemoveSecret(input: OwnerRemoveSecretInput): Promise<void> {
    await this._confirmSensitiveAction({
      password: input.password,
      verificationCode: input.verificationCode,
    }, {
      action: "delete_secret",
      subject: input.alias,
    });
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("remove_secret");
    
    await this._vault.ownerRemoveSecret({
      kind: "owner.remove_secret",
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      alias: input.alias,
      requestedAt,
    });
  }

  async ownerListAgents(input: VaultListAgentsInput = {}) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("list_agents");
    
    const agents = await this._vault.ownerListAgents({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
    });
    return agents.map((agent) => ({
      ...agent,
      privateKey: undefined,
    }));
  }

  async ownerListCapabilities(input: VaultListCapabilitiesInput = {}) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("list_capabilities");
    
    return this._vault.ownerListCapabilities({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
      agentId: input.agentId,
    });
  }

  async ownerListRequests(input: VaultListRequestsInput = {}) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("list_requests");

    return this._vault.ownerListRequests({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
      agentId: input.agentId,
    });
  }

  async ownerGetRequest(input: VaultGetRequestInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("get_request");

    return this._vault.ownerGetRequest({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
      targetRequestId: input.requestId,
    });
  }

  async ownerListCapabilityStates(input: VaultListCapabilityStatesInput = {}) {
    return this._vault.ownerListCapabilityStates({
      vaultId: this._vault.vaultId,
      owner: { kind: "owner", id: this._identityId },
      agentId: input.agentId,
      writeGranted: input.writeGranted,
      readGranted: input.readGranted,
    });
  }

  async ownerListSecrets(input: VaultListSecretsInput = {}) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("list_secrets");
    return this._vault.ownerListSecrets({
      vaultId: this._vault.vaultId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      requestId,
    });
  }

  async ownerRevokeCapability(input: VaultRevokeCapabilityInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("revoke_capability");

    return this._vault.ownerRevokeCapability({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      agentId: input.agentId,
      capabilityId: input.capabilityId,
    });
  }

  async ownerIssueSessionToken(input: VaultIssueSessionTokenInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("issue_session_token");

    return this._vault.ownerIssueSessionToken({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
      agentId: input.agentId,
      requestId,
      requestedAt,
    });
  }

  async ownerRevokeSessionToken(input: VaultRevokeSessionTokenInput) {
    return this._vault.ownerRevokeSessionToken({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
      token: input.token,
    });
  }

  async ownerSubmitCapabilityRequest(input: VaultSubmitCapabilityRequestInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("submit_capability_request");

    return this._vault.ownerSubmitCapabilityRequest({
      vaultId: this._vault.vaultId,
      requestId,
      requester: input.requester,
      agentId: input.agentId,
      capability: {
        operation: (input.operation as any) ?? "dispatch_http",
        write: {
          secretIds: input.write.secretIds ? [...input.write.secretIds] : undefined,
          scope: input.write.scope,
          methods: [...input.write.methods],
        },
        read: { paths: [...input.read.paths] },
        rateLimit: input.rateLimit,
        skipAudit: input.skipAudit,
        expiresAt: input.expiresAt,
      },
      reason: input.reason,
      requestedAt,
    });
  }

  async ownerIssueAllSessionTokens() {
    return this._vault.ownerIssueAllAgentSessionTokens({
      vaultId: this._vault.vaultId,
      actor: { kind: "owner", id: this._identityId },
    });
  }

  async ownerApproveCapabilityRead(input: VaultApproveCapabilityRequestInput) {
    return this._vault.ownerApproveCapabilityRead({
      vaultId: this._vault.vaultId,
      requestId: input.requestId,
      owner: { kind: "owner", id: this._identityId },
      read: input.read ? { paths: [...input.read.paths] } : undefined,
    });
  }

  async ownerAllowOnce(input: VaultApproveCapabilityRequestInput) {
    return this._vault.ownerAllowOnce({
      vaultId: this._vault.vaultId,
      requestId: input.requestId,
      owner: { kind: "owner", id: this._identityId },
    });
  }

  async ownerAllowAlways(input: VaultApproveCapabilityRequestInput) {
    return this._vault.ownerAllowAlways({
      vaultId: this._vault.vaultId,
      requestId: input.requestId,
      owner: { kind: "owner", id: this._identityId },
    });
  }

  async ownerDeny(requestId: string) {
    return this._vault.ownerDeny({
      vaultId: this._vault.vaultId,
      requestId,
      owner: { kind: "owner", id: this._identityId },
    });
  }

  ownerOnCapabilityState(callback: (record: import("../../vault-core/index.js").CapabilityStateRecord) => void): () => void {
    return this._vault.ownerOnCapabilityState(callback);
  }
}

function isCreateVaultClientOptions(value: unknown): value is CreateVaultClientOptions {
  return typeof value === "object" && value !== null && "vault" in value;
}

function isCreatedIdentity(value: VaultIdentity | CreatedIdentity): value is CreatedIdentity {
  return "privateKey" in value && "publicKey" in value;
}

function resolveVaultSigner(identity?: VaultIdentity | CreatedIdentity, signer?: VaultSigner): VaultSigner | undefined {
  if (signer) {
    return signer;
  }
  if (identity && isCreatedIdentity(identity)) {
    return new LocalSigner(identity);
  }
  return undefined;
}

function resolveVaultIdentity(options: CreateVaultClientOptions): VaultIdentity | undefined {
  if (!options.ownerIdentity) {
    return undefined;
  }
  return {
    identityId: options.ownerIdentity.identityId,
  };
}

/**
 * Creates a {@link VaultClient} instance for a specific vault owner.
 *
 * @param options - Configuration including optional owner identity and the vault service.
 * @returns An initialized {@link VaultClient}.
 *
 * @example
 * ```ts
 * const client = createVaultClient({
 *   ownerIdentity,
 *   vault
 * });
 * ```
 */
export function createVaultClient(options: CreateVaultClientOptions): VaultClient {
  if (!isCreateVaultClientOptions(options)) {
    throw new OwnerClientError(
      OwnerClientErrorCode.INVALID_CREATE_VAULT_CLIENT_OPTIONS,
      "createVaultClient() requires a single options object with 'vault'",
    );
  }
  const client = new DefaultVaultClient(
    options.vault,
    resolveVaultIdentity(options),
    resolveVaultSigner(options.ownerIdentity, options.signer),
    options.clock ?? new SystemClock(),
    options.skipWarmup,
    options.passwordVerifier,
    options.sensitiveActionVerifier,
  );

  if (!options.skipWarmup) {
    client.ownerIssueAllSessionTokens().catch((err: unknown) => {
      console.error("VaultClient: failed to warmup session tokens:", err);
    });
  }

  return client;
}
