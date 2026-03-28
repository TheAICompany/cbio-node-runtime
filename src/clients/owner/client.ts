import { OwnerClientError, OwnerClientErrorCode } from "../../errors.js";
import {
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
  VaultRegisterFlowInput,
  VaultImportAgentInput,
  VaultCreateAgentInput,
  OwnerAgentProvisionResult,
  OwnerCreateSecretInput,
  OwnerUpdateSecretInput,
  OwnerRemoveSecretInput,
  VaultUpdateAgentInput,
  VaultListAgentsInput,
  VaultListRequestsInput,
  VaultGetRequestInput,
  VaultListSecretsInput,
  VaultIssueSessionTokenInput,
  VaultRevokeSessionTokenInput,
  OwnerSensitiveActionConfirmation,
  OwnerSensitiveActionContext,
  OwnerClient,
  CreateOwnerClientOptions,
  VaultGrantAgentSecretInput,
  VaultGrantSecretDestinationInput,
  VaultRevokeAgentSecretInput,
  VaultRevokeSecretDestinationInput,
  VaultListGrantsInput,
  VaultApproveDispatchInput,
} from "./contracts.js";

const VAULT_MASTER_ID = "vault-master";

class DefaultOwnerClient implements OwnerClient {
  private readonly _rootAgentId: string;

  constructor(
    private readonly _vault: VaultService,
    private readonly _rootAgentIdInput?: string,
    private readonly _signer?: any,
    private readonly _clock: Clock = new SystemClock(),
    private readonly _skipWarmup: boolean = false,
    private readonly _passwordVerifier?: (password: string) => Promise<boolean> | boolean,
    private readonly _sensitiveActionVerifier?: (
      confirmation: OwnerSensitiveActionConfirmation,
      context: OwnerSensitiveActionContext,
    ) => Promise<boolean> | boolean,
  ) {
    this._rootAgentId = _rootAgentIdInput ?? VAULT_MASTER_ID;
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
        "OwnerClient: sensitiveActionVerifier or passwordVerifier is required for sensitive reads",
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

  async ownerCreateSecret(input: OwnerCreateSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("create_secret");
    
    return this._vault.ownerCreateSecret({
      kind: "owner.create_secret",
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._rootAgentId,
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
        id: this._rootAgentId,
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
        id: this._rootAgentId,
      },
      query: { ...query, vaultId: this._vault.vaultId },
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
        id: this._rootAgentId,
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
        id: this._rootAgentId,
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
      subject: input.rootAgentId,
    });
    const agents = await this._vault.ownerListAgents({
      vaultId: this._vault.vaultId,
      requestId: createRequestIdValue("read_agent_private_key"),
      requestedAt: input.requestedAt ?? this._clock.nowIso(),
      actor: {
        kind: "owner",
        id: this._rootAgentId,
      },
    });
    const agent = agents.find((record) => record.rootAgentId === input.rootAgentId);
    if (!agent?.privateKey) {
      throw new OwnerClientError(
        OwnerClientErrorCode.AGENT_PRIVATE_KEY_NOT_FOUND,
        "agent private key not found",
      );
    }
    return agent.privateKey;
  }

  private async _ownerRegisterManagedAgentIdentity(input: {
    rootAgentId: string;
    publicKey: string;
    privateKey?: string;
    metadata?: Record<string, any>;
    nickname?: string;
    requestedAt?: string;
  }): Promise<import("../../vault-core/index.js").AgentIdentityRecord> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("register_agent.identity");
    const agentRecord = {
      vaultId: this._vault.vaultId,
      rootAgentId: input.rootAgentId,
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
        id: this._rootAgentId,
      },
      agentRecord,
      requestedAt,
    });
    return agentRecord;
  }

  async ownerImportAgent(input: VaultImportAgentInput): Promise<OwnerAgentProvisionResult> {
    const identity = restoreIdentity(input.privateKey, { nickname: input.nickname });
    const agent = await this._ownerRegisterManagedAgentIdentity({
      rootAgentId: identity.rootAgentId,
      publicKey: identity.publicKey,
      privateKey: identity.privateKey,
      metadata: input.metadata,
      nickname: input.nickname,
      requestedAt: input.requestedAt,
    });
    const sessionToken = await this.ownerIssueSessionToken({
      rootAgentId: agent.rootAgentId,
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
      rootAgentId: identity.rootAgentId,
      publicKey: identity.publicKey,
      privateKey: identity.privateKey,
      metadata: input.metadata,
      nickname: input.nickname,
      requestedAt: input.requestedAt,
    });
    const sessionToken = await this.ownerIssueSessionToken({
      rootAgentId: agent.rootAgentId,
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
    const requestId = createRequestIdValue("update_agent.identity");
    const updated = await this._vault.ownerUpdateAgentIdentity({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._rootAgentId,
      },
      metadata: input.metadata,
      rootAgentId: input.rootAgentId,
      nickname: input.nickname,
      requestedAt,
    });
    return {
      ...updated,
      privateKey: undefined,
    };
  }

  async ownerGrantAgentSecret(input: VaultGrantAgentSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    return this._vault.ownerGrantAgentSecret({
      vaultId: this._vault.vaultId,
      requestId: createRequestIdValue("grant_agent_secret"),
      actor: { kind: "owner", id: this._rootAgentId },
      rootAgentId: input.rootAgentId,
      secretAlias: input.secretAlias,
      requestedAt,
    });
  }

  async ownerGrantSecretDestination(input: VaultGrantSecretDestinationInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    return this._vault.ownerGrantSecretDestination({
      vaultId: this._vault.vaultId,
      requestId: createRequestIdValue("grant_secret_destination"),
      actor: { kind: "owner", id: this._rootAgentId },
      secretAlias: input.secretAlias,
      domain: input.domain,
      requestedAt,
    });
  }

  async ownerRevokeAgentSecret(input: VaultRevokeAgentSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    return this._vault.ownerRevokeAgentSecret({
      vaultId: this._vault.vaultId,
      requestId: createRequestIdValue("revoke_agent_secret"),
      actor: { kind: "owner", id: this._rootAgentId },
      rootAgentId: input.rootAgentId,
      secretAlias: input.secretAlias,
      requestedAt,
    });
  }

  async ownerRevokeSecretDestination(input: VaultRevokeSecretDestinationInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    return this._vault.ownerRevokeSecretDestination({
      vaultId: this._vault.vaultId,
      requestId: createRequestIdValue("revoke_secret_destination"),
      actor: { kind: "owner", id: this._rootAgentId },
      secretAlias: input.secretAlias,
      domain: input.domain,
      requestedAt,
    });
  }

  async ownerListGrants(input: VaultListGrantsInput = {}) {
    const requestedAt = this._clock.nowIso();
    return this._vault.ownerListGrants({
      vaultId: this._vault.vaultId,
      requestId: createRequestIdValue("list_grants"),
      actor: { kind: "owner", id: this._rootAgentId },
      requestedAt,
    });
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
        id: this._rootAgentId,
      },
      flow,
      requestedAt,
    });
    return {
      vaultId: this._vault.vaultId,
      flowId,
      ownerId: this._rootAgentId,
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
        id: this._rootAgentId,
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
        id: this._rootAgentId,
      },
    });
    return agents.map((agent) => ({
      ...agent,
      privateKey: undefined,
    }));
  }

  async ownerListRequests(input: VaultListRequestsInput = {}) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("list_requests");

    return this._vault.ownerListRequests({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      actor: { kind: "owner", id: this._rootAgentId },
      rootAgentId: input.rootAgentId,
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
        id: this._rootAgentId,
      },
      targetRequestId: input.requestId,
    });
  }

  async ownerListSecrets(input: VaultListSecretsInput = {}) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("list_secrets");
    return this._vault.ownerListSecrets({
      vaultId: this._vault.vaultId,
      owner: {
        kind: "owner",
        id: this._rootAgentId,
      },
      requestId,
    });
  }

  async ownerIssueSessionToken(input: VaultIssueSessionTokenInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("issue_session_token");

    return this._vault.ownerIssueSessionToken({
      vaultId: this._vault.vaultId,
      requestId,
      rootAgentId: input.rootAgentId,
      actor: {
        kind: "owner",
        id: this._rootAgentId,
      },
      requestedAt,
    });
  }

  async ownerRevokeSessionToken(input: VaultRevokeSessionTokenInput) {
    return this._vault.ownerRevokeSessionToken({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._rootAgentId,
      },
      token: input.token,
    });
  }

  async ownerIssueAllSessionTokens() {
    return this._vault.ownerIssueAllAgentSessionTokens({
      kind: "owner",
      id: this._rootAgentId,
    } as any);
  }

  async ownerApproveDispatch(input: VaultApproveDispatchInput) {
    const requestedAt = this._clock.nowIso();
    return this._vault.ownerApproveDispatch({
      vaultId: this._vault.vaultId,
      requestId: input.requestId,
      actor: { kind: "owner", id: this._rootAgentId },
      decision: input.decision,
      requestedAt,
    });
  }

  async ownerDenyDispatch(requestId: string) {
    const requestedAt = this._clock.nowIso();
    await this._vault.ownerApproveDispatch({
      vaultId: this._vault.vaultId,
      requestId,
      actor: { kind: "owner", id: this._rootAgentId },
      decision: "deny",
      requestedAt,
    });
  }

  ownerOnPendingDispatch(callback: (record: import("../../vault-core/index.js").RequestRecord) => void): () => void {
    return this._vault.ownerOnPendingDispatch(callback);
  }
}

export async function createOwnerClient(options: CreateOwnerClientOptions): Promise<OwnerClient> {
  const identity = options.ownerIdentity;
  const rootAgentId = identity.rootAgentId;
  
  const client = new DefaultOwnerClient(
    options.vault,
    rootAgentId,
    undefined, // signer no longer directly used in simple owner client
    options.clock ?? new SystemClock(),
    options.skipWarmup ?? false,
    options.passwordVerifier,
    options.sensitiveActionVerifier,
  );

  if (!options.skipWarmup) {
    try {
      await client.ownerIssueAllSessionTokens();
    } catch (e) {
      console.warn("OwnerClient warmup failed:", e);
    }
  }

  return client;
}
