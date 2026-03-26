import {
  AuditAction,
  AuditOutcome,
  DispatchStatus,
} from "./contracts.js";
import type {
  CapabilityRequestScope,
  AgentListCapabilitiesRequest,
  AgentListSecretsRequest,
  AgentSubmitCapabilityRequestCommand,
  AgentVisibleSecretRecord,
  AuditEntry,
  AuditQuery,
  CustomHttpFlowDefinition,
  DispatchAuthorization,
  DispatchRequest,
  DispatchResult,
  OwnerApproveCapabilityRequestCommand,
  OwnerDefineSecretTargetsCommand,
  OwnerIssueSessionTokenRequest,
  OwnerRejectCapabilityRequestCommand,
  OwnerDeleteSecretCommand,
  OwnerExportSecretRequest,
  OwnerRegisterAgentIdentityCommand,
  OwnerUpdateAgentIdentityCommand,
  OwnerRegisterCapabilityCommand,
  OwnerRegisterCustomHttpFlowCommand,
  OwnerRevokeCapabilityCommand,
  OwnerListAgentsRequest,
  OwnerListCapabilitiesRequest,
  OwnerSecretExport,
  OwnerSessionToken,
  PendingCapabilityRequestRecord,
  SecretAlias,
  SecretId,
  SecretRecord,
  SubmitCapabilityRequestCommand,
  VaultId,
  VaultPrincipal,
  VaultWriteSecretCommand,
  AgentIdentityRecord,
  AgentCapability,
} from "./contracts.js";
import type { VaultCoreDependencies } from "./ports.js";
import { VaultCoreError } from "./errors.js";
import { verifySignature } from "../protocol/crypto.js";

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

function isScopeMatch(scope: string, targetUrl: string): boolean {
  if (scope.endsWith("*")) {
    return targetUrl.startsWith(scope.slice(0, -1));
  }
  return scope === targetUrl;
}

function createAgentControlBinding(
  requestId: string,
  requestedAt: string,
  agentId: string,
  action: string,
  payload: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    requestId,
    requestedAt,
    agentId,
    action,
    ...payload,
  });
}

/**
 * The Sovereign Vault Core.
 * This is the primary implementation of the Vault logic.
 */
export class VaultCore {
  private readonly _pendingObservers = new Set<(record: import("./contracts.js").PendingDispatchRecord) => void>();
  private readonly _pendingCapabilityObservers = new Set<(record: PendingCapabilityRequestRecord) => void>();

  constructor(private readonly _deps: VaultCoreDependencies) {}

  get vaultId() {
    return this._deps.vaultId;
  }

  private async _appendAudit(entry: AuditEntry): Promise<void> {
    try {
      await this._deps.audit.append(entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new VaultCoreError(`audit append failed: ${message}`, "VAULT_AUDIT_FAILED");
    }
  }

  private async _appendDecisionAudit(
    request: DispatchRequest,
    outcome: AuditOutcome.ALLOWED | AuditOutcome.DENIED | AuditOutcome.PENDING,
    detail: string,
    options?: {
      secretAlias?: string;
      secretId?: string;
    },
  ): Promise<void> {
    await this._appendAudit(
      toAuditEntry(this._deps, request.agent, AuditAction.AUTHORIZE_DISPATCH, outcome, detail, {
        requestId: request.requestId,
        capabilityId: request.capability?.capabilityId,
        operation: (request.capability?.operation as any) ?? AuditAction.AUTHORIZE_DISPATCH,
        targetUrl: request.targetUrl,
        secretAlias: options?.secretAlias ?? request.secretAlias,
        secretId: options?.secretId,
      }),
    );
  }

  private async _verifyAgentControlProof(request: {
    vaultId: VaultId;
    requestId: string;
    requestedAt: string;
    agent: VaultPrincipal & { kind: "agent" };
    proof: import("./contracts.js").AgentProof;
  }, action: string, payload: Record<string, unknown> = {}): Promise<void> {
    if (request.proof.agentId !== request.agent.id) {
      throw new VaultCoreError("agent identity mismatch", "VAULT_DISPATCH_DENIED");
    }
    if (request.proof.token) {
      const valid = await this._deps.sessionTokens.verify(request.proof.token, request.agent.id);
      if (!valid) {
        throw new VaultCoreError("invalid or expired session token", "VAULT_DISPATCH_DENIED");
      }
      return;
    }
    if (!request.proof.signature) {
      throw new VaultCoreError("missing agent proof (signature or token required)", "VAULT_DISPATCH_DENIED");
    }
    if (request.proof.requestId !== request.requestId || request.proof.requestedAt !== request.requestedAt) {
      throw new VaultCoreError("proof binding mismatch", "VAULT_DISPATCH_DENIED");
    }
    const identity = await this._deps.agentIdentities.get(request.vaultId, request.agent.id);
    if (!identity) {
      throw new VaultCoreError("agent identity not registered", "VAULT_DISPATCH_DENIED");
    }
    const binding = createAgentControlBinding(
      request.requestId,
      request.requestedAt,
      request.agent.id,
      action,
      payload,
    );
    if (!verifySignature(identity.publicKey, request.proof.signature, binding)) {
      throw new VaultCoreError("invalid proof signature", "VAULT_DISPATCH_DENIED");
    }
  }

  private async _listVisibleSecretsForAgent(agentId: string): Promise<readonly AgentVisibleSecretRecord[]> {
    const capabilities = await this._deps.capabilities.list(this._deps.vaultId, agentId);
    const capabilityMap = new Map<string, {
      capabilityId: string;
      scope: string;
      methods: readonly string[];
    }[]>();
    for (const capability of capabilities) {
      for (const alias of capability.secretAliases ?? []) {
        const existing = capabilityMap.get(alias) ?? [];
        existing.push({
          capabilityId: capability.capabilityId,
          scope: capability.scope,
          methods: [...capability.methods],
        });
        capabilityMap.set(alias, existing);
      }
    }
    const records = await this._deps.secrets.list(this._deps.vaultId);
    return records.map((record) => {
      const authorizedCapabilities = capabilityMap.get(record.alias.value) ?? [];
      return {
        vaultId: record.vaultId,
        secretId: record.secretId,
        alias: record.alias,
        issuerId: record.issuerId,
        targetBindings: [...record.targetBindings],
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        isAuthorizedForAgent: authorizedCapabilities.length > 0,
        authorizedCapabilities,
      };
    });
  }


  ownerOnPendingDispatch(callback: (record: import("./contracts.js").PendingDispatchRecord) => void): () => void {
    this._pendingObservers.add(callback);
    return () => {
      this._pendingObservers.delete(callback);
    };
  }

  ownerOnPendingCapabilityRequest(callback: (record: PendingCapabilityRequestRecord) => void): () => void {
    this._pendingCapabilityObservers.add(callback);
    return () => {
      this._pendingCapabilityObservers.delete(callback);
    };
  }

  async ownerRegisterAgentIdentity(command: OwnerRegisterAgentIdentityCommand): Promise<void> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("identity registration vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    if (command.agentIdentity.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("agent identity vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    try {
      // Sovereign Vault: Owner has full privileges. No signature required for unlocked vault.
      await this._deps.agentIdentities.register(command.agentIdentity);
      await this._appendAudit(
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
      await this._appendAudit(
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

  async ownerUpdateAgentIdentity(command: OwnerUpdateAgentIdentityCommand): Promise<AgentIdentityRecord> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("identity update vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    const existing = await this._deps.agentIdentities.get(this._deps.vaultId, command.agentId);
    if (!existing) {
      throw new VaultCoreError("agent identity not found", "VAULT_IDENTITY_DENIED");
    }
    const updated: AgentIdentityRecord = {
      ...existing,
      nickname: command.nickname,
      metadata: command.metadata,
    };
    try {
      await this._deps.agentIdentities.register(updated);
      await this._appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          AuditAction.UPDATE_AGENT_IDENTITY,
          AuditOutcome.SUCCEEDED,
          `agent identity updated: ${command.agentId}`,
          {
            requestId: command.requestId,
            agentId: command.agentId,
          },
        ),
      );
      return updated;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this._appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          AuditAction.UPDATE_AGENT_IDENTITY,
          AuditOutcome.DENIED,
          detail,
          {
            requestId: command.requestId,
            agentId: command.agentId,
          },
        ),
      );
      throw error;
    }
  }

  async ownerRegisterCapability(command: OwnerRegisterCapabilityCommand): Promise<void> {
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
      await this._appendAudit(
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
      await this._appendAudit(
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

  async ownerSubmitCapabilityRequest(command: SubmitCapabilityRequestCommand): Promise<PendingCapabilityRequestRecord> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("capability request vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    if (!command.agentId.trim()) {
      throw new VaultCoreError("capability request agent id required", "VAULT_IDENTITY_DENIED");
    }
    if (!command.scope.scope.trim()) {
      throw new VaultCoreError("capability request scope required", "VAULT_IDENTITY_DENIED");
    }
    if (command.scope.methods.length === 0) {
      throw new VaultCoreError("capability request method required", "VAULT_IDENTITY_DENIED");
    }
    const pendingRecord: PendingCapabilityRequestRecord = {
      vaultId: this._deps.vaultId,
      requestId: command.requestId,
      requester: command.requester,
      agentId: command.agentId,
      scope: {
        operation: command.scope.operation,
        secretAliases: command.scope.secretAliases ? [...command.scope.secretAliases] : [],
        scope: command.scope.scope,
        methods: [...command.scope.methods],
        rateLimit: command.scope.rateLimit,
        skipAudit: command.scope.skipAudit,
        expiresAt: command.scope.expiresAt,
      },
      justification: command.justification,
      requestedAt: command.requestedAt,
    };
    await this._deps.pendingCapabilityRequests.save(pendingRecord);

    for (const observer of this._pendingCapabilityObservers) {
      try {
        observer(pendingRecord);
      } catch (error) {
        console.error("VaultCore: error in pending capability observer:", error);
      }
    }

    await this._appendAudit(
      toAuditEntry(
        this._deps,
        command.requester,
        AuditAction.SUBMIT_CAPABILITY_REQUEST,
        AuditOutcome.PENDING,
        `capability request submitted for agent: ${command.agentId}`,
        {
          requestId: command.requestId,
          agentId: command.agentId,
          operation: command.scope.operation,
        },
      ),
    );

    return pendingRecord;
  }

  async _getCapability(vaultId: import("./contracts.js").VaultId, agentId: string, capabilityId: string) {
    if (vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("capability lookup vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    return this._deps.capabilities.get(vaultId, agentId, capabilityId);
  }

  async ownerRegisterCustomFlow(command: OwnerRegisterCustomHttpFlowCommand): Promise<void> {
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
      await this._appendAudit(
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
      await this._appendAudit(
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

  async _storeCustomFlowSecret(flow: CustomHttpFlowDefinition, alias: string, plaintext: string): Promise<SecretRecord> {
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
      await this._appendAudit(
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
      await this._appendAudit(
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

  async ownerWriteSecret(command: VaultWriteSecretCommand): Promise<SecretRecord> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    try {
      await this._deps.policy.authorizeWrite(command);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this._appendAudit(
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
      await this._appendAudit(
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
      await this._appendAudit(
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

  async ownerDeleteSecret(command: OwnerDeleteSecretCommand): Promise<void> {
    const record = await this._deps.secrets.getByAlias({ value: command.alias });
    if (!record) {
      throw new VaultCoreError(`secret not found: ${command.alias}`, "VAULT_SECRET_NOT_FOUND");
    }

    await this._deps.secrets.delete(record.secretId);
    await this._deps.custody.delete(record.secretId);
    
    await this._appendAudit(
      toAuditEntry(this._deps, command.owner, AuditAction.DELETE_SECRET, AuditOutcome.SUCCEEDED, `deleted secret ${command.alias}`, {
        requestId: command.requestId,
        secretAlias: command.alias,
        secretId: record.secretId.value,
      }),
    );
  }

  async ownerDefineSecretTargets(command: OwnerDefineSecretTargetsCommand): Promise<SecretRecord> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    try {
      await this._deps.policy.authorizeDefineSecretTargets(command);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this._appendAudit(
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
      await this._appendAudit(
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
    await this._appendAudit(
      toAuditEntry(this._deps, command.owner, AuditAction.DEFINE_SECRET_TARGETS, AuditOutcome.SUCCEEDED, "secret targets defined", {
        requestId: command.requestId,
        secretAlias: nextRecord.alias.value,
        secretId: nextRecord.secretId.value,
      }),
    );
    return nextRecord;
  }

  async agentAuthorizeDispatch(request: DispatchRequest): Promise<DispatchAuthorization> {
    if (request.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("request vault mismatch", "VAULT_DISPATCH_DENIED");
    }
    const record = request.secretAlias
      ? await this._deps.secrets.getByAlias({ value: request.secretAlias })
      : null;
    if (request.secretAlias && !record) {
      await this._appendDecisionAudit(request, AuditOutcome.DENIED, "secret not found");
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
      // Removed direct policy.authorizeDispatch here to handle discovery
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this._appendDecisionAudit(request, AuditOutcome.DENIED, detail, {
        secretAlias: record?.alias.value ?? request.secretAlias,
        secretId: record?.secretId.value,
      });
      throw error;
    }

    // DISCOVERY LOGIC: Find best matching capability
    const agentRecord = await this._deps.agentIdentities.get(this._deps.vaultId, request.agent.id);
    if (!agentRecord) {
       return { vaultId: this._deps.vaultId, decision: "deny", reason: "agent not found", secretId: null, executorTarget: null };
    }

    const capabilities = await this._deps.capabilities.list(this._deps.vaultId, request.agent.id);
    const capability = capabilities.find(cap => this.isCapabilityMatch(cap, request));

    const executorTarget = record
      ? record.targetBindings.find((binding) => binding.targetUrl === request.targetUrl)
        ?? record.targetBindings.find((binding) => binding.targetId === request.targetUrl)
        ?? null
      : null;

    if (!capability) {
      // It's a discovery case if the agent and secret exist but no capability matches
      const pendingRecord = {
        requestId: request.requestId,
        agentId: request.agent.id,
        capabilityId: undefined,
        secretAlias: request.secretAlias ?? "unknown",
        targetUrl: request.targetUrl,
        method: request.method,
        headers: request.headers,
        body: request.body,
        requestedAt: request.requestedAt,
        proof: request.proof,
      };
      await this._deps.pendingRequests.save(pendingRecord);

      // Notify observers
      for (const observer of this._pendingObservers) {
        try {
          observer(pendingRecord);
        } catch (error) {
          console.error("VaultCore: error in pending observer:", error);
        }
      }

      await this._appendDecisionAudit(request, AuditOutcome.PENDING, "dispatch stalled for manual discovery approval", {
        secretAlias: record?.alias.value ?? request.secretAlias,
        secretId: record?.secretId.value,
      });

      return {
        vaultId: this._deps.vaultId,
        decision: "pending",
        reason: "no matching capability found (discovery needed)",
        secretId: record?.secretId ?? null,
        executorTarget,
      };
    }

    // Capability found, proceed
    if (!capability.skipAudit) {
      await this._appendDecisionAudit(request, AuditOutcome.ALLOWED, "dispatch authorized", {
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
      capability, // Expose the found capability for subsequent steps
    };
  }

  async agentDispatchSecret(request: DispatchRequest): Promise<DispatchResult> {
    const authorization = await this.agentAuthorizeDispatch(request);
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

    await this._appendAudit(
      toAuditEntry(
        this._deps,
        request.agent,
        AuditAction.DISPATCH_SECRET,
        result.status === DispatchStatus.SUCCEEDED ? AuditOutcome.SUCCEEDED : AuditOutcome.FAILED,
        result.status === DispatchStatus.SUCCEEDED ? "dispatch completed" : (result.error ?? "dispatch failed"),
        {
          requestId: request.requestId,
          capabilityId: authorization.capability?.capabilityId,
          operation: authorization.capability?.operation,
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

  async ownerReadAudit(
    actor: VaultPrincipal & { kind: "owner" },
    query: AuditQuery,
    request?: Omit<import("./contracts.js").OwnerAuditRequest, "actor" | "query" | "vaultId">,
  ): Promise<readonly AuditEntry[]> {
    const entries = await this._deps.audit.query(query);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.READ_AUDIT, AuditOutcome.ALLOWED, "audit queried"),
    );
    return entries;
  }

  async ownerExportSecret(
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
      await this._appendAudit(
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
      await this._appendAudit(
        toAuditEntry(this._deps, actor, AuditAction.EXPORT_SECRET, AuditOutcome.DENIED, detail, {
          requestId: request?.requestId,
          secretAlias: alias,
        }),
      );
      throw error;
    }
  }

  private isCapabilityMatch(capability: AgentCapability, request: DispatchRequest): boolean {
    // Basic Iron Triangle match
    if (request.secretAlias && !capability.secretAliases?.includes(request.secretAlias)) {
      return false;
    }

    if (request.method && capability.methods?.length > 0 && !capability.methods.includes(request.method)) {
      return false;
    }

    if (capability.scope && !isScopeMatch(capability.scope, request.targetUrl)) {
      return false;
    }

    return true;
  }

  async ownerListAgents(
    actor: VaultPrincipal & { kind: "owner" },
    request?: Omit<OwnerListAgentsRequest, "actor" | "vaultId">,
  ): Promise<readonly AgentIdentityRecord[]> {
    const identities = await this._deps.agentIdentities.list(this._deps.vaultId);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.LIST_AGENTS, AuditOutcome.ALLOWED, "agent identities listed", {
        requestId: request?.requestId,
      }),
    );
    return identities;
  }

  async ownerListCapabilities(
    actor: VaultPrincipal & { kind: "owner" },
    agentId?: string,
    request?: Omit<OwnerListCapabilitiesRequest, "actor" | "agentId" | "vaultId">,
  ): Promise<readonly AgentCapability[]> {
    const capabilities = await this._deps.capabilities.list(this._deps.vaultId, agentId);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.LIST_CAPABILITIES, AuditOutcome.ALLOWED, "capabilities listed", {
        requestId: request?.requestId,
        agentId,
      }),
    );
    return capabilities;
  }

  async ownerListSecrets(
    actor: VaultPrincipal & { kind: "owner" },
    request?: { requestId?: string },
  ): Promise<readonly AgentVisibleSecretRecord[]> {
    const records = await this._deps.secrets.list(this._deps.vaultId);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.READ_AUDIT, AuditOutcome.ALLOWED, "secret metadata listed", {
        requestId: request?.requestId,
      }),
    );
    return records.map((record) => ({
      vaultId: record.vaultId,
      secretId: record.secretId,
      alias: record.alias,
      issuerId: record.issuerId,
      targetBindings: [...record.targetBindings],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  async agentListCapabilities(request: AgentListCapabilitiesRequest): Promise<readonly AgentCapability[]> {
    if (request.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("read vault mismatch", "VAULT_READ_DENIED");
    }
    await this._verifyAgentControlProof(request, "list_capabilities");
    return this._deps.capabilities.list(this._deps.vaultId, request.agent.id);
  }

  async agentListSecrets(request: AgentListSecretsRequest): Promise<readonly AgentVisibleSecretRecord[]> {
    if (request.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("read vault mismatch", "VAULT_READ_DENIED");
    }
    await this._verifyAgentControlProof(request, "list_secrets");
    return this._listVisibleSecretsForAgent(request.agent.id);
  }

  async agentSubmitCapabilityRequest(command: AgentSubmitCapabilityRequestCommand): Promise<PendingCapabilityRequestRecord> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    await this._verifyAgentControlProof(command, "submit_capability_request", {
      scope: command.scope.scope,
      methods: command.scope.methods,
      operation: command.scope.operation,
      secretAliases: command.scope.secretAliases ?? [],
      justification: command.justification ?? null,
    });
    return this.ownerSubmitCapabilityRequest({
      vaultId: command.vaultId,
      requestId: command.requestId,
      requester: command.agent,
      agentId: command.agent.id,
      scope: command.scope,
      justification: command.justification,
      requestedAt: command.requestedAt,
    });
  }

  async ownerRevokeCapability(command: OwnerRevokeCapabilityCommand): Promise<void> {
    await this._deps.policy.revokeCapability(command.vaultId, command.agentId, command.capabilityId);
    await this._appendAudit(
      toAuditEntry(this._deps, command.owner, AuditAction.REVOKE_CAPABILITY, AuditOutcome.SUCCEEDED, "capability revoked", {
        requestId: command.requestId,
        agentId: command.agentId,
        capabilityId: command.capabilityId,
      }),
    );
  }

  async ownerIssueSessionToken(request: OwnerIssueSessionTokenRequest): Promise<OwnerSessionToken> {
    if (request.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("session token vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    const agent = await this._deps.agentIdentities.get(this._deps.vaultId, request.agentId);
    if (!agent) {
      throw new VaultCoreError("agent identity not found", "VAULT_IDENTITY_DENIED");
    }
    const token = await this._deps.sessionTokens.issue(request.agentId);
    const issuedAt = this._deps.clock.nowIso();

    await this._appendAudit(
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

  async ownerIssueAllAgentSessionTokens(actor: VaultPrincipal & { kind: "owner" }): Promise<OwnerSessionToken[]> {
    const agents = await this._deps.agentIdentities.list(this._deps.vaultId);
    const results: OwnerSessionToken[] = [];
    const requestedAt = this._deps.clock.nowIso();
    for (const agent of agents) {
      results.push(await this.ownerIssueSessionToken({
        vaultId: this._deps.vaultId,
        requestId: `warmup_${this._deps.ids.newVersion().value}`,
        actor,
        agentId: agent.agentId,
        requestedAt,
      }));
    }
    return results;
  }

  async ownerRevokeSessionToken(request: { vaultId: VaultId; actor: VaultPrincipal & { kind: "owner" }; token: string }): Promise<void> {
    if (request.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("session token vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    await this._deps.sessionTokens.revoke(request.token);
    await this._appendAudit(
      toAuditEntry(
        this._deps,
        request.actor,
        AuditAction.REVOKE_SESSION_TOKEN,
        AuditOutcome.SUCCEEDED,
        "session token revoked",
      ),
    );
  }

  async ownerListPendingDispatches(command: { vaultId: VaultId; owner: VaultPrincipal }): Promise<readonly import("./contracts.js").PendingDispatchRecord[]> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("read vault mismatch", "VAULT_READ_DENIED");
    }
    return this._deps.pendingRequests.list(command.vaultId);
  }

  async ownerListPendingCapabilityRequests(command: { vaultId: VaultId; owner: VaultPrincipal }): Promise<readonly PendingCapabilityRequestRecord[]> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("read vault mismatch", "VAULT_READ_DENIED");
    }
    return this._deps.pendingCapabilityRequests.list(command.vaultId);
  }

  async ownerApproveCapabilityRequest(command: OwnerApproveCapabilityRequestCommand): Promise<AgentCapability> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    const pending = await this._deps.pendingCapabilityRequests.get(command.requestId);
    if (!pending) {
      throw new VaultCoreError("pending capability request not found", "VAULT_REQUEST_NOT_FOUND");
    }
    const capability: AgentCapability = {
      vaultId: this._deps.vaultId,
      agentId: pending.agentId,
      capabilityId: command.capabilityId ?? `cap_${this._deps.ids.newVersion().value}`,
      operation: pending.scope.operation,
      secretAliases: pending.scope.secretAliases ? [...pending.scope.secretAliases] : [],
      scope: pending.scope.scope,
      methods: [...pending.scope.methods],
      rateLimit: pending.scope.rateLimit,
      skipAudit: pending.scope.skipAudit,
      expiresAt: pending.scope.expiresAt,
      issuedAt: this._deps.clock.nowIso(),
    };

    await this._deps.capabilities.register(capability);
    await this._deps.pendingCapabilityRequests.delete(command.requestId);

    await this._appendAudit(
      toAuditEntry(
        this._deps,
        command.owner,
        AuditAction.APPROVE_CAPABILITY_REQUEST,
        AuditOutcome.SUCCEEDED,
        `approved capability request ${command.requestId}`,
        {
          requestId: command.requestId,
          agentId: pending.agentId,
          capabilityId: capability.capabilityId,
          operation: capability.operation,
        },
      ),
    );

    return capability;
  }

  async ownerRejectCapabilityRequest(command: OwnerRejectCapabilityRequestCommand): Promise<void> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    const pending = await this._deps.pendingCapabilityRequests.get(command.requestId);
    if (!pending) {
      throw new VaultCoreError("pending capability request not found", "VAULT_REQUEST_NOT_FOUND");
    }

    await this._deps.pendingCapabilityRequests.delete(command.requestId);
    await this._appendAudit(
      toAuditEntry(
        this._deps,
        command.owner,
        AuditAction.REJECT_CAPABILITY_REQUEST,
        AuditOutcome.SUCCEEDED,
        `rejected capability request ${command.requestId}`,
        {
          requestId: command.requestId,
          agentId: pending.agentId,
          operation: pending.scope.operation,
        },
      ),
    );
  }

  async ownerApproveDispatch(command: import("./contracts.js").OwnerApproveDispatchCommand): Promise<DispatchResult> {
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

    let capability: AgentCapability;

    if (pending.capabilityId) {
      const existing = await this._deps.capabilities.get(this._deps.vaultId, pending.agentId, pending.capabilityId);
      if (!existing) {
        throw new VaultCoreError("capability not found", "VAULT_CAPABILITY_NOT_FOUND");
      }
      capability = existing;
    } else {
      // Discovery case: derive from request
      const capabilityId = `cap-${this._deps.clock.nowIso()}-${Math.random().toString(36).slice(2, 7)}`;
        capability = {
          vaultId: this._deps.vaultId,
          agentId: pending.agentId,
          capabilityId,
          secretAliases: [pending.secretAlias],
          methods: [pending.method],
          scope: pending.targetUrl,
          operation: "dispatch_http",
          issuedAt: this._deps.clock.nowIso(),
          skipAudit: command.skipAudit ?? false,
      };

      if (command.permanent) {
        await this._deps.capabilities.register(capability);
      }
    }

    const result = await this.agentDispatchSecret({
      vaultId: this._deps.vaultId,
      agent: { kind: "agent", id: pending.agentId },
      capability: capability,
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
    
    await this._appendAudit(
      toAuditEntry(this._deps, command.owner, AuditAction.APPROVE_DISPATCH, AuditOutcome.SUCCEEDED, `approved dispatch ${command.requestId}${command.permanent ? " and granted permanent capability" : ""}`, {
        requestId: command.requestId,
        agentId: pending.agentId,
        capabilityId: capability.capabilityId,
      }),
    );

    return result;
  }

  async ownerRejectDispatch(command: import("./contracts.js").OwnerRejectDispatchCommand): Promise<void> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    const pending = await this._deps.pendingRequests.get(command.requestId);
    if (!pending) {
      throw new VaultCoreError("pending request not found", "VAULT_REQUEST_NOT_FOUND");
    }

    await this._deps.pendingRequests.delete(command.requestId);

    await this._appendAudit(
      toAuditEntry(this._deps, command.owner, AuditAction.REJECT_DISPATCH, AuditOutcome.SUCCEEDED, `rejected dispatch ${command.requestId}`, {
        requestId: command.requestId,
      }),
    );
  }
}

export function createVaultCore(deps: VaultCoreDependencies): VaultCore {
  return new VaultCore(deps);
}
