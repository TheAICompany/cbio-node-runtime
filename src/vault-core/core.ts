import {
  AuditAction,
  AuditOutcome,
  DispatchStatus,
} from "./contracts.js";
import type {
  AuditEntry,
  AuditQuery,
  CustomHttpFlowDefinition,
  DispatchAuthorization,
  DispatchRequest,
  DispatchResult,
  OwnerDefineSecretTargetsCommand,
  OwnerIssueSessionTokenRequest,
  OwnerDeleteSecretCommand,
  OwnerExportSecretRequest,
  OwnerRegisterAgentIdentityCommand,
  OwnerRegisterCapabilityCommand,
  OwnerRegisterCustomHttpFlowCommand,
  OwnerRevokeCapabilityCommand,
  OwnerListAgentsRequest,
  OwnerListCapabilitiesRequest,
  OwnerSecretExport,
  OwnerSessionToken,
  SecretAlias,
  SecretId,
  SecretRecord,
  VaultId,
  VaultPrincipal,
  VaultWriteSecretCommand,
  AgentIdentityRecord,
  AgentCapability,
} from "./contracts.js";
import type { VaultCoreDependencies } from "./ports.js";
import { VaultCoreError } from "./errors.js";

function toAuditEntry(
  deps: VaultCoreDependencies,
  actor: VaultPrincipal,
  action: AuditAction,
  outcome: AuditOutcome,
  detail: string,
  options?: {
    requestId?: string;
    capabilityId?: string;
    operation?: AuditEntry["operation"];
    targetUrl?: string;
    secretAlias?: string;
    secretId?: string;
    agentId?: string;
  },
): AuditEntry {
  return {
    entryId: deps.ids.newAuditEntryId(),
    occurredAt: deps.clock.nowIso(),
    vaultId: deps.vaultId.value,
    actor,
    action,
    outcome,
    detail,
    requestId: options?.requestId,
    capabilityId: options?.capabilityId,
    operation: options?.operation ?? action,
    targetUrl: options?.targetUrl,
    secretAlias: options?.secretAlias,
    secretId: options?.secretId,
    agentId: options?.agentId,
  };
}

function buildSecretRecord(
  deps: VaultCoreDependencies,
  command: VaultWriteSecretCommand,
): SecretRecord {
  const now = deps.clock.nowIso();
  return {
    vaultId: deps.vaultId,
    secretId: deps.ids.newSecretId(),
    alias: { value: command.alias },
    version: deps.ids.newVersion(),
    issuerId: command.kind === "issuer.write_secret" ? command.issuerSiteId : null,
    targetBindings: command.kind === "issuer.write_secret"
      ? [...(command.targetBindings ?? [{ kind: "site", targetId: command.issuerSiteId }])]
      : [...(command.targetBindings ?? [])],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * The Sovereign Vault Core.
 * This is the primary implementation of the Vault logic.
 */
export class VaultCore {
  constructor(private readonly _deps: VaultCoreDependencies) {}

  get vaultId() {
    return this._deps.vaultId;
  }

  private async appendAudit(entry: AuditEntry): Promise<void> {
    try {
      await this._deps.audit.append(entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new VaultCoreError(`audit append failed: ${message}`, "VAULT_AUDIT_FAILED");
    }
  }

  private async appendDecisionAudit(
    request: DispatchRequest,
    outcome: AuditOutcome.ALLOWED | AuditOutcome.DENIED | AuditOutcome.PENDING,
    detail: string,
    options?: {
      secretAlias?: string;
      secretId?: string;
    },
  ): Promise<void> {
    await this.appendAudit(
      toAuditEntry(this._deps, request.agent, AuditAction.AUTHORIZE_DISPATCH, outcome, detail, {
        requestId: request.requestId,
        capabilityId: request.capability.capabilityId,
        operation: request.capability.operation,
        targetUrl: request.targetUrl,
        secretAlias: options?.secretAlias ?? request.secretAlias,
        secretId: options?.secretId,
      }),
    );
  }


  async registerAgentIdentity(command: OwnerRegisterAgentIdentityCommand): Promise<void> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("identity registration vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    if (command.agentIdentity.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("agent identity vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    try {
      // Sovereign Vault: Owner has full privileges. No signature required for unlocked vault.
      await this._deps.agentIdentities.register(command.agentIdentity);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          AuditAction.REGISTER_AGENT_IDENTITY,
          AuditOutcome.SUCCEEDED,
          `agent identity registered: ${command.agentIdentity.agentId}`,
        ),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          AuditAction.REGISTER_AGENT_IDENTITY,
          AuditOutcome.DENIED,
          detail,
        ),
      );
      throw error;
    }
  }

  async registerCapability(command: OwnerRegisterCapabilityCommand): Promise<void> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("capability registration vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    if (command.capability.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("capability vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    if (command.capability.agentId !== command.capability.agentId.trim() || !command.capability.agentId.trim()) {
      throw new VaultCoreError("capability agent id required", "VAULT_IDENTITY_DENIED");
    }
    if (!command.capability.capabilityId.trim()) {
      throw new VaultCoreError("capability id required", "VAULT_IDENTITY_DENIED");
    }
    try {
      await this._deps.capabilities.register(command.capability);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          AuditAction.REGISTER_CAPABILITY,
          AuditOutcome.SUCCEEDED,
          `capability registered: ${command.capability.capabilityId}`,
          {
            capabilityId: command.capability.capabilityId,
            operation: command.capability.operation,
          },
        ),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          AuditAction.REGISTER_CAPABILITY,
          AuditOutcome.DENIED,
          detail,
          {
            capabilityId: command.capability.capabilityId,
            operation: command.capability.operation,
          },
        ),
      );
      throw error;
    }
  }

  async getCapability(vaultId: import("./contracts.js").VaultId, agentId: string, capabilityId: string) {
    if (vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("capability lookup vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    return this._deps.capabilities.get(vaultId, agentId, capabilityId);
  }

  async registerCustomFlow(command: OwnerRegisterCustomHttpFlowCommand): Promise<void> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("custom flow vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    if (!command.flow.flowId.trim()) {
      throw new VaultCoreError("custom flow id required", "VAULT_IDENTITY_DENIED");
    }
    if (command.flow.mode !== "send_secret" && !command.flow.responseSecret) {
      throw new VaultCoreError("custom flow response secret rule required", "VAULT_IDENTITY_DENIED");
    }
    try {
      await this._deps.customFlows.register({
        vaultId: this._deps.vaultId,
        flowId: command.flow.flowId,
        ownerId: command.owner.id,
        mode: command.flow.mode,
        targetUrl: command.flow.targetUrl,
        method: command.flow.method,
        responseVisibility: command.flow.responseVisibility,
        responseSecret: command.flow.responseSecret,
        createdAt: this._deps.clock.nowIso(),
      });
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          AuditAction.REGISTER_CUSTOM_FLOW,
          AuditOutcome.SUCCEEDED,
          `custom http flow registered: ${command.flow.flowId}`,
        ),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          AuditAction.REGISTER_CUSTOM_FLOW,
          AuditOutcome.DENIED,
          detail,
        ),
      );
      throw error;
    }
  }

  async storeCustomFlowSecret(flow: CustomHttpFlowDefinition, alias: string, plaintext: string): Promise<SecretRecord> {
    const actor: VaultPrincipal & { kind: "owner" } = { kind: "owner", id: flow.ownerId };
    const targetBindings = [{
      kind: "site" as const,
      targetId: flow.flowId,
      targetUrl: flow.targetUrl,
      methods: [flow.method],
      paths: [new URL(flow.targetUrl).pathname || "/"],
    }];
    const existing = await this._deps.secrets.getByAlias({ value: alias });
    if (existing) {
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          actor,
          AuditAction.REASSIGN_ALIAS,
          AuditOutcome.DENIED,
          "alias already bound to existing secret; explicit alias lifecycle required",
          {
            secretAlias: existing.alias.value,
            secretId: existing.secretId.value,
          },
        ),
      );
      throw new VaultCoreError("alias already bound to existing secret", "VAULT_WRITE_DENIED");
    }
    const record = buildSecretRecord(this._deps, {
      kind: "owner.write_secret",
      vaultId: this._deps.vaultId,
      requestId: `${flow.flowId}:${alias}:custom_flow_store`,
      owner: actor,
      alias,
      plaintext,
      targetBindings,
      requestedAt: this._deps.clock.nowIso(),
    });
    try {
      await this._deps.custody.store(record.secretId, plaintext);
      await this._deps.secrets.save(record);
      await this.appendAudit(
        toAuditEntry(this._deps, actor, AuditAction.WRITE_SECRET, AuditOutcome.SUCCEEDED, `custom flow stored secret: ${alias}`, {
          secretAlias: record.alias.value,
          secretId: record.secretId.value,
        }),
      );
    } catch (error) {
      await Promise.allSettled([
        this._deps.secrets.delete(record.secretId),
        this._deps.custody.delete(record.secretId),
      ]);
      throw error;
    }
    return record;
  }

  async writeSecret(command: VaultWriteSecretCommand): Promise<SecretRecord> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    try {
      await this._deps.policy.authorizeWrite(command);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.kind === "owner.write_secret" ? command.owner : command.issuer,
          AuditAction.WRITE_SECRET,
          AuditOutcome.DENIED,
          detail,
          {
            secretAlias: command.alias,
          },
        ),
      );
      throw error;
    }
    const existing = await this._deps.secrets.getByAlias({ value: command.alias });
    if (existing) {
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.kind === "owner.write_secret" ? command.owner : command.issuer,
          AuditAction.REASSIGN_ALIAS,
          AuditOutcome.DENIED,
          "alias already bound to existing secret; explicit alias lifecycle required",
          {
            secretAlias: existing.alias.value,
            secretId: existing.secretId.value,
          },
        ),
      );
      throw new VaultCoreError("alias already bound to existing secret", "VAULT_WRITE_DENIED");
    }
    const record = buildSecretRecord(this._deps, command);
    try {
      await this._deps.custody.store(record.secretId, command.plaintext);
      await this._deps.secrets.save(record);
      await this.appendAudit(
        toAuditEntry(this._deps, command.kind === "owner.write_secret" ? command.owner : command.issuer, AuditAction.WRITE_SECRET, AuditOutcome.SUCCEEDED, "secret stored", {
          secretAlias: record.alias.value,
          secretId: record.secretId.value,
        }),
      );
    } catch (error) {
      await Promise.allSettled([
        this._deps.secrets.delete(record.secretId),
        this._deps.custody.delete(record.secretId),
      ]);
      throw error;
    }
    return record;
  }

  async deleteSecret(command: OwnerDeleteSecretCommand): Promise<void> {
    const record = await this._deps.secrets.getByAlias({ value: command.alias });
    if (!record) {
      throw new VaultCoreError(`secret not found: ${command.alias}`, "VAULT_SECRET_NOT_FOUND");
    }

    await this._deps.secrets.delete(record.secretId);
    await this._deps.custody.delete(record.secretId);
    
    await this.appendAudit(
      toAuditEntry(this._deps, command.owner, AuditAction.DELETE_SECRET, AuditOutcome.SUCCEEDED, `deleted secret ${command.alias}`, {
        requestId: command.requestId,
        secretAlias: command.alias,
        secretId: record.secretId.value,
      }),
    );
  }

  async defineSecretTargets(command: OwnerDefineSecretTargetsCommand): Promise<SecretRecord> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    try {
      await this._deps.policy.authorizeDefineSecretTargets(command);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          AuditAction.DEFINE_SECRET_TARGETS,
          AuditOutcome.DENIED,
          detail,
          {
            secretAlias: command.alias,
          },
        ),
      );
      throw error;
    }

    const existing = await this._deps.secrets.getByAlias({ value: command.alias });
    if (!existing) {
      const error = new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");
      await this.appendAudit(
        toAuditEntry(this._deps, command.owner, AuditAction.DEFINE_SECRET_TARGETS, AuditOutcome.DENIED, error.message, {
          secretAlias: command.alias,
        }),
      );
      throw error;
    }

    const nextRecord: SecretRecord = {
      ...existing,
      targetBindings: [...command.targetBindings],
      updatedAt: this._deps.clock.nowIso(),
    };
    await this._deps.secrets.save(nextRecord);
    await this.appendAudit(
      toAuditEntry(this._deps, command.owner, AuditAction.DEFINE_SECRET_TARGETS, AuditOutcome.SUCCEEDED, "secret targets defined", {
        requestId: command.requestId,
        secretAlias: nextRecord.alias.value,
        secretId: nextRecord.secretId.value,
      }),
    );
    return nextRecord;
  }

  async authorizeDispatch(request: DispatchRequest): Promise<DispatchAuthorization> {
    if (request.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("request vault mismatch", "VAULT_DISPATCH_DENIED");
    }
    const record = request.secretAlias
      ? await this._deps.secrets.getByAlias({ value: request.secretAlias })
      : null;
    if (request.secretAlias && !record) {
      await this.appendDecisionAudit(request, AuditOutcome.DENIED, "secret not found");
      return {
        vaultId: this._deps.vaultId,
        decision: "deny",
        reason: "secret not found",
        secretId: null,
        executorTarget: null,
      };
    }

    try {
      await this._deps.replayGuard.assertNotReplayed(request);
      await this._deps.agentProofVerifier.verify(request);
      await this._deps.policy.authorizeDispatch(request, record);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendDecisionAudit(request, AuditOutcome.DENIED, detail, {
        secretAlias: record?.alias.value ?? request.secretAlias,
        secretId: record?.secretId.value,
      });
      throw error;
    }

    const executorTarget = record
      ? record.targetBindings.find((binding) => binding.targetUrl === request.targetUrl)
        ?? record.targetBindings.find((binding) => binding.targetId === request.targetUrl)
        ?? null
      : null;

    if (request.capability.requiresApproval) {
      await this._deps.pendingRequests.save({
        requestId: request.requestId,
        agentId: request.agent.id,
        capabilityId: request.capability.capabilityId,
        secretAlias: request.secretAlias ?? "unknown",
        targetUrl: request.targetUrl,
        method: request.method,
        headers: request.headers,
        body: request.body,
        requestedAt: request.requestedAt,
        proof: request.proof,
      });

      await this.appendDecisionAudit(request, AuditOutcome.PENDING, "dispatch stalled for manual approval", {
        secretAlias: record?.alias.value ?? request.secretAlias,
        secretId: record?.secretId.value,
      });

      return {
        vaultId: this._deps.vaultId,
        decision: "pending",
        reason: "manual approval required",
        secretId: record?.secretId ?? null,
        executorTarget,
      };
    }

    if (request.capability.auditRequired !== false) {
      await this.appendDecisionAudit(request, AuditOutcome.ALLOWED, "dispatch authorized", {
        secretAlias: record?.alias.value ?? request.secretAlias,
        secretId: record?.secretId.value,
      });
    }

    return {
      vaultId: this._deps.vaultId,
      decision: "allow",
      reason: null,
      secretId: record?.secretId ?? null,
      executorTarget,
    };
  }

  async dispatchSecret(request: DispatchRequest): Promise<DispatchResult> {
    const authorization = await this.authorizeDispatch(request);
    if (authorization.decision === "deny" || !authorization.secretId) {
      throw new VaultCoreError("dispatch denied", "VAULT_DISPATCH_DENIED");
    }

    if (authorization.decision === "pending") {
      return {
        vaultId: this._deps.vaultId,
        requestId: request.requestId,
        status: DispatchStatus.PENDING,
        targetUrl: request.targetUrl,
        method: request.method,
      };
    }

    const record = await this._deps.secrets.getById(authorization.secretId);
    if (!record) {
      throw new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");
    }
    const plaintext = await this._deps.custody.load(record.secretId);
    if (plaintext === null) {
      throw new VaultCoreError("secret material not found", "VAULT_SECRET_NOT_FOUND");
    }

    const result = await this._deps.executor.dispatch(
      {
        vaultId: this._deps.vaultId,
        requestId: request.requestId,
        secretId: record.secretId,
        targetUrl: request.targetUrl,
        method: request.method,
        headers: request.headers,
        body: request.body,
      },
      { record, plaintext },
    );

    await this.appendAudit(
      toAuditEntry(
        this._deps,
        request.agent,
        AuditAction.DISPATCH_SECRET,
        result.status === DispatchStatus.SUCCEEDED ? AuditOutcome.SUCCEEDED : AuditOutcome.FAILED,
        result.status === DispatchStatus.SUCCEEDED ? "dispatch completed" : (result.error ?? "dispatch failed"),
        {
          requestId: request.requestId,
          capabilityId: request.capability.capabilityId,
          operation: request.capability.operation,
          targetUrl: request.targetUrl,
          secretAlias: record.alias.value,
          secretId: record.secretId.value,
        },
      ),
    );

    return {
      ...result,
      vaultId: this._deps.vaultId,
    };
  }

  async getAudit(
    actor: VaultPrincipal & { kind: "owner" },
    query: AuditQuery,
    request?: Omit<import("./contracts.js").OwnerAuditRequest, "actor" | "query" | "vaultId">,
  ): Promise<readonly AuditEntry[]> {
    const entries = await this._deps.audit.query(query);
    await this.appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.READ_AUDIT, AuditOutcome.ALLOWED, "audit queried"),
    );
    return entries;
  }

  async exportSecret(
    actor: VaultPrincipal & { kind: "owner" },
    alias: string,
    request?: Omit<OwnerExportSecretRequest, "actor" | "alias" | "vaultId">,
  ): Promise<OwnerSecretExport> {
    try {
      const record = await this._deps.secrets.getByAlias({ value: alias });
      if (!record) {
        throw new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");
      }
      const plaintext = await this._deps.custody.load(record.secretId);
      if (plaintext === null) {
        throw new VaultCoreError("secret material not found", "VAULT_SECRET_NOT_FOUND");
      }
      const exportedAt = this._deps.clock.nowIso();
      await this.appendAudit(
        toAuditEntry(this._deps, actor, AuditAction.EXPORT_SECRET, AuditOutcome.SUCCEEDED, "secret exported", {
          requestId: request?.requestId,
          secretAlias: record.alias.value,
          secretId: record.secretId.value,
        }),
      );
      return {
        vaultId: this._deps.vaultId,
        secretId: record.secretId,
        alias: record.alias,
        plaintext,
        exportedAt,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendAudit(
        toAuditEntry(this._deps, actor, AuditAction.EXPORT_SECRET, AuditOutcome.DENIED, detail, {
          requestId: request?.requestId,
          secretAlias: alias,
        }),
      );
      throw error;
    }
  }

  async listAgents(
    actor: VaultPrincipal & { kind: "owner" },
    request?: Omit<OwnerListAgentsRequest, "actor" | "vaultId">,
  ): Promise<readonly AgentIdentityRecord[]> {
    const identities = await this._deps.agentIdentities.list(this._deps.vaultId);
    await this.appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.LIST_AGENTS, AuditOutcome.ALLOWED, "agent identities listed", {
        requestId: request?.requestId,
      }),
    );
    return identities;
  }

  async listCapabilities(
    actor: VaultPrincipal & { kind: "owner" },
    agentId?: string,
    request?: Omit<OwnerListCapabilitiesRequest, "actor" | "agentId" | "vaultId">,
  ): Promise<readonly AgentCapability[]> {
    const capabilities = await this._deps.capabilities.list(this._deps.vaultId, agentId);
    await this.appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.LIST_CAPABILITIES, AuditOutcome.ALLOWED, "capabilities listed", {
        requestId: request?.requestId,
        agentId,
      }),
    );
    return capabilities;
  }

  async revokeCapability(command: OwnerRevokeCapabilityCommand): Promise<void> {
    await this._deps.policy.revokeCapability(command.vaultId, command.agentId, command.capabilityId);
    await this.appendAudit(
      toAuditEntry(this._deps, command.owner, AuditAction.REVOKE_CAPABILITY, AuditOutcome.SUCCEEDED, "capability revoked", {
        requestId: command.requestId,
        agentId: command.agentId,
        capabilityId: command.capabilityId,
      }),
    );
  }

  async issueAgentSessionToken(request: OwnerIssueSessionTokenRequest): Promise<OwnerSessionToken> {
    if (request.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("session token vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    const agent = await this._deps.agentIdentities.get(this._deps.vaultId, request.agentId);
    if (!agent) {
      throw new VaultCoreError("agent identity not found", "VAULT_IDENTITY_DENIED");
    }
    const token = await this._deps.sessionTokens.issue(request.agentId);
    const issuedAt = this._deps.clock.nowIso();

    await this.appendAudit(
      toAuditEntry(
        this._deps,
        request.actor,
        AuditAction.ISSUE_SESSION_TOKEN,
        AuditOutcome.SUCCEEDED,
        `session token issued for agent: ${request.agentId}`,
      ),
    );

    return {
      token,
      agentId: request.agentId,
      issuedAt,
    };
  }

  async revokeAgentSessionToken(request: { vaultId: VaultId; actor: VaultPrincipal & { kind: "owner" }; token: string }): Promise<void> {
    if (request.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("session token vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    await this._deps.sessionTokens.revoke(request.token);
    await this.appendAudit(
      toAuditEntry(
        this._deps,
        request.actor,
        AuditAction.REVOKE_SESSION_TOKEN,
        AuditOutcome.SUCCEEDED,
        "session token revoked",
      ),
    );
  }

  async listPendingDispatches(command: { vaultId: VaultId; owner: VaultPrincipal }): Promise<readonly import("./contracts.js").PendingDispatchRecord[]> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("read vault mismatch", "VAULT_READ_DENIED");
    }
    return this._deps.pendingRequests.list(command.vaultId);
  }

  async approveDispatch(command: import("./contracts.js").OwnerApproveDispatchCommand): Promise<DispatchResult> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    const pending = await this._deps.pendingRequests.get(command.requestId);
    if (!pending) {
      throw new VaultCoreError("pending request not found", "VAULT_REQUEST_NOT_FOUND");
    }

    const agentRecord = await this._deps.agentIdentities.get(this._deps.vaultId, pending.agentId);
    if (!agentRecord) {
      throw new VaultCoreError("agent identity not found", "VAULT_AGENT_NOT_FOUND");
    }

    const capability = await this._deps.capabilities.get(this._deps.vaultId, pending.agentId, pending.capabilityId);
    if (!capability) {
      throw new VaultCoreError("capability not found", "VAULT_CAPABILITY_NOT_FOUND");
    }

    // Mark as approved (temporarily bypass requiresApproval)
    const approvedCapability = { ...capability, requiresApproval: false };

    const result = await this.dispatchSecret({
      vaultId: this._deps.vaultId,
      agent: { kind: "agent", id: pending.agentId },
      capability: approvedCapability,
      secretAlias: pending.secretAlias === "unknown" ? undefined : pending.secretAlias,
      targetUrl: pending.targetUrl,
      method: pending.method,
      headers: pending.headers,
      body: pending.body,
      proof: pending.proof,
      requestId: pending.requestId,
      requestedAt: pending.requestedAt,
    });

    await this._deps.pendingRequests.delete(command.requestId);
    
    await this.appendAudit(
      toAuditEntry(this._deps, command.owner, AuditAction.APPROVE_DISPATCH, AuditOutcome.SUCCEEDED, `approved dispatch ${command.requestId}`, {
        requestId: command.requestId,
      }),
    );

    return result;
  }

  async rejectDispatch(command: import("./contracts.js").OwnerRejectDispatchCommand): Promise<void> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    const pending = await this._deps.pendingRequests.get(command.requestId);
    if (!pending) {
      throw new VaultCoreError("pending request not found", "VAULT_REQUEST_NOT_FOUND");
    }

    await this._deps.pendingRequests.delete(command.requestId);

    await this.appendAudit(
      toAuditEntry(this._deps, command.owner, AuditAction.REJECT_DISPATCH, AuditOutcome.SUCCEEDED, `rejected dispatch ${command.requestId}`, {
        requestId: command.requestId,
      }),
    );
  }
}

export function createVaultCore(deps: VaultCoreDependencies): VaultCore {
  return new VaultCore(deps);
}
