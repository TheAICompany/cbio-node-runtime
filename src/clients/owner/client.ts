import { OwnerClientError, OwnerClientErrorCode } from "../../errors.js";
import {
  createRequestIdValue,
} from "../../internal/id-factory.js";
import { createIdentity, restoreIdentity, type CreatedIdentity } from "../../runtime/identity.js";
import { SystemClock, VaultCoreError, type Clock } from "../../vault-core/index.js";
import type { VaultService } from "../../vault-ingress/index.js";
import type {
  VaultAuditQueryInput,
  VaultExportSecretInput,
  VaultReadSecretPlaintextInput,
  VaultReadAgentPrivateKeyInput,

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
  private readonly _root_agent_id: string;

  constructor(
    private readonly _vault: VaultService,
    private readonly _clock: Clock = new SystemClock(),
    private readonly _skipWarmup: boolean = false,
    private readonly _password_verifier?: (password: string) => Promise<boolean> | boolean,
    private readonly _sensitiveActionVerifier?: (
      confirmation: OwnerSensitiveActionConfirmation,
      context: OwnerSensitiveActionContext,
    ) => Promise<boolean> | boolean,
  ) {
    this._root_agent_id = VAULT_MASTER_ID;
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
    if (!this._password_verifier) {
      throw new OwnerClientError(
        OwnerClientErrorCode.SENSITIVE_ACTION_VERIFIER_REQUIRED,
        "OwnerClient: sensitiveActionVerifier or password_verifier is required for sensitive reads",
      );
    }
    const valid = await this._password_verifier(normalizedPassword);
    if (!valid) {
      throw new OwnerClientError(
        OwnerClientErrorCode.SENSITIVE_ACTION_INVALID_PASSWORD,
        "invalid vault password",
      );
    }
  }

  async ownerCreateSecret(input: OwnerCreateSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  async ownerCreateSecret(input: OwnerCreateSecretInput[]): Promise<import("../../vault-core/index.js").SecretRecord[]>;
  async ownerCreateSecret(input: OwnerCreateSecretInput | OwnerCreateSecretInput[]): Promise<import("../../vault-core/index.js").SecretRecord | import("../../vault-core/index.js").SecretRecord[]> {
    const isBatch = Array.isArray(input);
    const items = isBatch ? input : [input];
    const requested_at = this._clock.nowIso();

    // Phase 1: 并行校验（所有别名不得已存在）
    // 通过 ownerListSecrets 获取当前所有别名，批量对比，避免逐个网络往返
    const existing = await this._vault.ownerListSecrets({ vault_id: this._vault.vault_id, owner: { kind: "owner", id: this._root_agent_id } });
    const existingAliases = new Set(existing.map(s => s.alias.value));
    const duplicates = items.filter(item => existingAliases.has(item.alias));
    if (duplicates.length > 0) {
      const names = duplicates.map(d => `"${d.alias}"`).join(", ");
      throw new VaultCoreError(`secret alias already exists: ${names}`, "VAULT_ALIAS_ALREADY_EXISTS");
    }

    // Phase 2: 并行写入（校验全过才到这里）
    const results = await Promise.all(items.map(item => {
      return this._vault.ownerCreateSecret({
        kind: "owner.create_secret",
        vault_id: this._vault.vault_id,
        request_id: createRequestIdValue("create_secret"),
        owner: { kind: "owner", id: this._root_agent_id },
        alias: item.alias,
        plaintext: item.plaintext,
        source: { kind: "manual" },
        requested_at: item.requested_at ?? requested_at,
      });
    }));

    return isBatch ? results : results[0];
  }

  async ownerUpdateSecret(input: OwnerUpdateSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  async ownerUpdateSecret(input: OwnerUpdateSecretInput[]): Promise<import("../../vault-core/index.js").SecretRecord[]>;
  async ownerUpdateSecret(input: OwnerUpdateSecretInput | OwnerUpdateSecretInput[]): Promise<import("../../vault-core/index.js").SecretRecord | import("../../vault-core/index.js").SecretRecord[]> {
    const isBatch = Array.isArray(input);
    const items = isBatch ? input : [input];
    const requested_at = this._clock.nowIso();

    // Phase 1: 并行校验（所有别名必须已存在）
    const existing = await this._vault.ownerListSecrets({ vault_id: this._vault.vault_id, owner: { kind: "owner", id: this._root_agent_id } });
    const existingAliases = new Set(existing.map(s => s.alias.value));
    const missing = items.filter(item => !existingAliases.has(item.alias));
    if (missing.length > 0) {
      const names = missing.map(d => `"${d.alias}"`).join(", ");
      throw new VaultCoreError(`secret not found: ${names}`, "VAULT_SECRET_NOT_FOUND");
    }

    // Phase 2: 并行写入
    const results = await Promise.all(items.map(item => {
      return this._vault.ownerUpdateSecret({
        kind: "owner.update_secret",
        vault_id: this._vault.vault_id,
        request_id: createRequestIdValue("update_secret"),
        owner: { kind: "owner", id: this._root_agent_id },
        alias: item.alias,
        plaintext: item.plaintext,
        source: { kind: "manual" },
        requested_at: item.requested_at ?? requested_at,
      });
    }));

    return isBatch ? results : results[0];
  }

  async ownerReadAudit(query: VaultAuditQueryInput = {}) {
    const requested_at = this._clock.nowIso();
    const request_id = createRequestIdValue("read_audit");
    
    return this._vault.ownerReadAudit({
      vault_id: this._vault.vault_id,
      actor: {
        kind: "owner",
        id: this._root_agent_id,
      },
      query: { ...query, vault_id: this._vault.vault_id.value },
      request_id,
      requested_at,
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
    const requested_at = input.requested_at ?? this._clock.nowIso();
    const request_id = createRequestIdValue("export_secret");
    
    return this._vault.ownerExportSecret({
      vault_id: this._vault.vault_id,
      actor: {
        kind: "owner",
        id: this._root_agent_id,
      },
      alias: input.alias,
      request_id,
      requested_at,
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
      vault_id: this._vault.vault_id,
      actor: {
        kind: "owner",
        id: this._root_agent_id,
      },
      alias: input.alias,
      request_id: createRequestIdValue("read_secret_plaintext"),
      requested_at: input.requested_at ?? this._clock.nowIso(),
    });
    return exported.plaintext;
  }

  async ownerReadAgentPrivateKey(input: VaultReadAgentPrivateKeyInput): Promise<string> {
    await this._confirmSensitiveAction({
      password: input.password,
      verificationCode: input.verificationCode,
    }, {
      action: "read_agent_private_key",
      subject: input.root_agent_id,
    });
    const agents = await this._vault.ownerListAgents({
      vault_id: this._vault.vault_id,
      request_id: createRequestIdValue("read_agent_private_key"),
      requested_at: input.requested_at ?? this._clock.nowIso(),
      actor: {
        kind: "owner",
        id: this._root_agent_id,
      },
    });
    const agent = agents.find((record) => record.root_agent_id === input.root_agent_id);
    if (!agent?.private_key) {
      throw new OwnerClientError(
        OwnerClientErrorCode.AGENT_PRIVATE_KEY_NOT_FOUND,
        "agent private key not found",
      );
    }
    return agent.private_key;
  }

  private async _ownerRegisterManagedAgentIdentity(input: {
    root_agent_id: string;
    public_key: string;
    private_key?: string;
    metadata?: Record<string, any>;
    nickname?: string;
    requested_at?: string;
  }): Promise<import("../../vault-core/index.js").AgentIdentityRecord> {
    const requested_at = input.requested_at ?? this._clock.nowIso();
    const request_id = createRequestIdValue("register_agent.identity");
    const agentRecord = {
      vault_id: this._vault.vault_id,
      root_agent_id: input.root_agent_id,
      public_key: input.public_key,
      private_key: input.private_key,
      metadata: input.metadata,
      nickname: input.nickname,
    };
    
    await this._vault.ownerRegisterAgentIdentity({
      vault_id: this._vault.vault_id,
      request_id,
      owner: {
        kind: "owner",
        id: this._root_agent_id,
      },
      agentRecord,
      requested_at,
    });
    return agentRecord;
  }

  async ownerImportAgent(input: VaultImportAgentInput): Promise<OwnerAgentProvisionResult> {
    const identity = restoreIdentity(input.private_key, { nickname: input.nickname });
    const agent = await this._ownerRegisterManagedAgentIdentity({
      root_agent_id: identity.root_agent_id,
      public_key: identity.public_key,
      private_key: identity.private_key,
      metadata: input.metadata,
      nickname: input.nickname,
      requested_at: input.requested_at,
    });
    const session_token = await this.ownerIssueSessionToken({
      root_agent_id: agent.root_agent_id,
      requested_at: input.requested_at,
    });
    return {
      agent: {
        ...agent,
        private_key: undefined,
      },
      session_token,
    };
  }

  async ownerCreateAgent(input: VaultCreateAgentInput): Promise<OwnerAgentProvisionResult> {
    const identity = createIdentity();
    const agent = await this._ownerRegisterManagedAgentIdentity({
      root_agent_id: identity.root_agent_id,
      public_key: identity.public_key,
      private_key: identity.private_key,
      metadata: input.metadata,
      nickname: input.nickname,
      requested_at: input.requested_at,
    });
    const session_token = await this.ownerIssueSessionToken({
      root_agent_id: agent.root_agent_id,
      requested_at: input.requested_at,
    });
    return {
      agent: {
        ...agent,
        private_key: undefined,
      },
      session_token,
    };
  }

  async ownerUpdateAgent(input: VaultUpdateAgentInput): Promise<import("../../vault-core/index.js").AgentIdentityRecord> {
    const requested_at = input.requested_at ?? this._clock.nowIso();
    const request_id = createRequestIdValue("update_agent.identity");
    const updated = await this._vault.ownerUpdateAgentIdentity({
      vault_id: this._vault.vault_id,
      request_id,
      owner: {
        kind: "owner",
        id: this._root_agent_id,
      },
      metadata: input.metadata,
      root_agent_id: input.root_agent_id,
      nickname: input.nickname,
      requested_at,
    });
    return {
      ...updated,
      private_key: undefined,
    };
  }

  async ownerGrantAgentSecret(input: VaultGrantAgentSecretInput) {
    const requested_at = input.requested_at ?? this._clock.nowIso();
    return this._vault.ownerGrantAgentSecret({
      vault_id: this._vault.vault_id,
      request_id: createRequestIdValue("grant_agent_secret"),
      actor: { kind: "owner", id: this._root_agent_id },
      root_agent_id: input.root_agent_id,
      secret_alias: input.secret_alias,
      requested_at,
    });
  }

  async ownerGrantSecretDestination(input: VaultGrantSecretDestinationInput) {
    const requested_at = input.requested_at ?? this._clock.nowIso();
    return this._vault.ownerGrantSecretDestination({
      vault_id: this._vault.vault_id,
      request_id: createRequestIdValue("grant_secret_destination"),
      actor: { kind: "owner", id: this._root_agent_id },
      secret_alias: input.secret_alias,
      site_id: input.site_id,
      requested_at,
    });
  }

  async ownerRevokeAgentSecret(input: VaultRevokeAgentSecretInput) {
    const requested_at = input.requested_at ?? this._clock.nowIso();
    return this._vault.ownerRevokeAgentSecret({
      vault_id: this._vault.vault_id,
      request_id: createRequestIdValue("revoke_agent_secret"),
      actor: { kind: "owner", id: this._root_agent_id },
      root_agent_id: input.root_agent_id,
      secret_alias: input.secret_alias,
      requested_at,
    });
  }

  async ownerRevokeSecretDestination(input: VaultRevokeSecretDestinationInput) {
    const requested_at = input.requested_at ?? this._clock.nowIso();
    return this._vault.ownerRevokeSecretDestination({
      vault_id: this._vault.vault_id,
      request_id: createRequestIdValue("revoke_secret_destination"),
      actor: { kind: "owner", id: this._root_agent_id },
      secret_alias: input.secret_alias,
      site_id: input.site_id,
      requested_at,
    });
  }

  async ownerListGrants(input: VaultListGrantsInput = {}) {
    const requested_at = this._clock.nowIso();
    return this._vault.ownerListGrants({
      vault_id: this._vault.vault_id,
      request_id: createRequestIdValue("list_grants"),
      actor: { kind: "owner", id: this._root_agent_id },
      requested_at,
    });
  }



  async ownerRemoveSecret(input: OwnerRemoveSecretInput): Promise<void> {
    await this._confirmSensitiveAction({
      password: input.password,
      verificationCode: input.verificationCode,
    }, {
      action: "delete_secret",
      subject: input.alias,
    });
    const requested_at = input.requested_at ?? this._clock.nowIso();
    const request_id = createRequestIdValue("remove_secret");
    
    await this._vault.ownerRemoveSecret({
      kind: "owner.remove_secret",
      vault_id: this._vault.vault_id,
      request_id,
      owner: {
        kind: "owner",
        id: this._root_agent_id,
      },
      alias: input.alias,
      requested_at,
    });
  }

  async ownerListAgents(input: VaultListAgentsInput = {}) {
    const requested_at = input.requested_at ?? this._clock.nowIso();
    const request_id = createRequestIdValue("list_agents");
    
    const agents = await this._vault.ownerListAgents({
      vault_id: this._vault.vault_id,
      request_id,
      requested_at,
      actor: {
        kind: "owner",
        id: this._root_agent_id,
      },
    });
    return agents.map((agent) => ({
      ...agent,
      private_key: undefined,
    }));
  }

  async ownerListRequests(input: VaultListRequestsInput = {}) {
    const requested_at = input.requested_at ?? this._clock.nowIso();
    const request_id = createRequestIdValue("list_requests");

    return this._vault.ownerListRequests({
      vault_id: this._vault.vault_id,
      request_id,
      requested_at,
      actor: { kind: "owner", id: this._root_agent_id },
      root_agent_id: input.root_agent_id,
    });
  }

  async ownerGetRequest(input: VaultGetRequestInput) {
    const requested_at = input.requested_at ?? this._clock.nowIso();
    const request_id = createRequestIdValue("get_request");

    return this._vault.ownerGetRequest({
      vault_id: this._vault.vault_id,
      request_id,
      requested_at,
      actor: {
        kind: "owner",
        id: this._root_agent_id,
      },
      target_request_id: input.request_id,
    });
  }

  async ownerListSecrets(input: VaultListSecretsInput = {}) {
    const requested_at = input.requested_at ?? this._clock.nowIso();
    const request_id = createRequestIdValue("list_secrets");
    return this._vault.ownerListSecrets({
      vault_id: this._vault.vault_id,
      owner: {
        kind: "owner",
        id: this._root_agent_id,
      },
      request_id,
    });
  }

  async ownerIssueSessionToken(input: VaultIssueSessionTokenInput) {
    const requested_at = input.requested_at ?? this._clock.nowIso();
    const request_id = createRequestIdValue("issue_session_token");

    return this._vault.ownerIssueSessionToken({
      vault_id: this._vault.vault_id,
      request_id,
      root_agent_id: input.root_agent_id,
      actor: {
        kind: "owner",
        id: this._root_agent_id,
      },
      requested_at,
    });
  }

  async ownerRevokeSessionToken(input: VaultRevokeSessionTokenInput) {
    return this._vault.ownerRevokeSessionToken({
      vault_id: this._vault.vault_id,
      actor: {
        kind: "owner",
        id: this._root_agent_id,
      },
      token: input.token,
    });
  }

  async ownerIssueAllSessionTokens() {
    return this._vault.ownerIssueAllAgentSessionTokens({
      kind: "owner",
      id: this._root_agent_id,
    } as any);
  }

  async ownerApproveDispatch(input: VaultApproveDispatchInput) {
    const requested_at = this._clock.nowIso();
    return this._vault.ownerApproveDispatch({
      vault_id: this._vault.vault_id,
      request_id: input.request_id,
      actor: { kind: "owner", id: this._root_agent_id },
      decision: input.decision,
      requested_at,
    });
  }

  async ownerDenyDispatch(request_id: string) {
    const requested_at = this._clock.nowIso();
    await this._vault.ownerApproveDispatch({
      vault_id: this._vault.vault_id,
      request_id,
      actor: { kind: "owner", id: this._root_agent_id },
      decision: "deny",
      requested_at,
    });
  }

  ownerOnPendingDispatch(callback: (record: import("../../vault-core/index.js").RequestRecord) => void): () => void {
    return this._vault.ownerOnPendingDispatch(callback);
  }
}

export async function createOwnerClient(options: CreateOwnerClientOptions): Promise<OwnerClient> {
  const client = new DefaultOwnerClient(
    options.vault,
    options.clock ?? new SystemClock(),
    options.skipWarmup ?? false,
    options.password_verifier,
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
