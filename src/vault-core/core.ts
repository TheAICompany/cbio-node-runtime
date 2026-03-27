import {
  AuditAction,
  AuditOutcome,
  DispatchStatus,
} from "./contracts.js";
import type {
  CapabilityRequestScope,
  AgentListCapabilitiesRequest,
  AgentListSecretsRequest,
  AgentGetRuntimeManifestRequest,
  AgentRuntimeManifest,
  AgentSubmitCapabilityRequestCommand,
  AgentVisibleSecretRecord,
  AuditEntry,
  AuditQuery,
  AgentCapabilityState,
  CustomHttpFlowDefinition,
  DispatchAuthorization,
  DispatchRequest,
  DispatchResult,
  OwnerExecuteCapabilityStateCommand,
  OwnerDefineSecretTargetsCommand,
  OwnerIssueSessionTokenRequest,
  OwnerRejectCapabilityStateCommand,
  OwnerDeleteSecretCommand,
  OwnerExportSecretRequest,
  OwnerRegisterAgentIdentityCommand,
  OwnerUpdateAgentIdentityCommand,
  OwnerRegisterCapabilityCommand,
  OwnerRegisterCustomHttpFlowCommand,
  OwnerRevokeCapabilityCommand,
  OwnerListAgentsRequest,
  OwnerListCapabilitiesRequest,
  OwnerListCapabilityStatesRequest,
  OwnerSecretExport,
  OwnerSessionToken,
  SecretAlias,
  SecretId,
  SecretRecord,
  SubmitCapabilityRequestCommand,
  VaultId,
  VaultPrincipal,
  VaultWriteSecretCommand,
  AgentIdentityRecord,
  AgentCapability,
  CapabilityStateRecord,
} from "./contracts.js";
import type { VaultCoreDependencies } from "./ports.js";
import { VaultCoreError } from "./errors.js";
import { verifySignature } from "../protocol/crypto.js";
import { getAgentToolbox } from "./tool-metadata.js";

const VAULT_MASTER_ID = "vault-master";


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

function normalizeScopeTarget(targetUrl: string): string | null {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.hash = "";
    parsed.search = "";
    if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
      parsed.port = "";
    }
    parsed.pathname = parsed.pathname || "/";
    return parsed.toString();
  } catch {
    return null;
  }
}

function isScopeMatch(scope: string, targetUrl: string): boolean {
  const normalizedTarget = normalizeScopeTarget(targetUrl);
  if (!normalizedTarget) {
    return false;
  }
  if (scope.endsWith("*")) {
    const normalizedPrefix = normalizeScopeTarget(scope.slice(0, -1));
    return normalizedPrefix ? normalizedTarget.startsWith(normalizedPrefix) : false;
  }
  const normalizedScope = normalizeScopeTarget(scope);
  return normalizedScope === normalizedTarget;
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
  private readonly _capabilityStateObservers = new Set<(record: CapabilityStateRecord) => void>();

  constructor(private readonly _deps: VaultCoreDependencies) {}

  private _assertOwnerPrincipal(actor: VaultPrincipal, code: "VAULT_AUDIT_DENIED" | "VAULT_IDENTITY_DENIED" = "VAULT_AUDIT_DENIED"): void {
    if (actor.kind !== "owner" || actor.id !== VAULT_MASTER_ID) {
      throw new VaultCoreError("owner access denied", code);
    }
  }

  private _stateToGrantedCapability(state: import("./contracts.js").CapabilityStateRecord): AgentCapability {
    return {
      vaultId: state.vaultId,
      capabilityId: state.capabilityId ?? "",
      agentId: state.agentId,
      secretIds: state.secretIds ? [...state.secretIds] : undefined,
      secretAliases: state.secretAliases ? [...state.secretAliases] : undefined,
      operation: state.operation,
      customFlowId: state.customFlowId,
      scope: state.scope,
      methods: [...state.methods],
      issuedAt: state.issuedAt ?? state.requestedAt,
      expiresAt: state.expiresAt,
      rateLimit: state.rateLimit,
      skipAudit: state.skipAudit,
    };
  }

  private async _buildAgentCapabilityStates(agentId: string): Promise<readonly AgentCapabilityState[]> {
    return (await this._deps.capabilityStates.list(this._deps.vaultId, agentId)).map((state) => ({
      status: state.status,
      source: state.source,
      agentId: state.agentId,
      requestId: state.requestId,
      capabilityId: state.capabilityId,
      operation: state.operation,
      secretIds: state.secretIds ? [...state.secretIds] : undefined,
      secretAliases: state.secretAliases ? [...state.secretAliases] : undefined,
      customFlowId: state.customFlowId,
      scope: state.scope,
      methods: [...state.methods],
      issuedAt: state.issuedAt,
      requestedAt: state.requestedAt,
      expiresAt: state.expiresAt,
      rateLimit: state.rateLimit,
      skipAudit: state.skipAudit,
      justification: state.justification,
      secretAlias: state.secretAlias,
      targetUrl: state.targetUrl,
    }));
  }

  private _isExecutablePendingState(state: CapabilityStateRecord): state is CapabilityStateRecord & {
    requestId: string;
    targetUrl: string;
    secretAlias: string;
    proof: import("./contracts.js").AgentProof;
  } {
    return !!(state.requestId && state.targetUrl && state.secretAlias && state.proof);
  }

  private async _executePendingCapabilityState(
    command: OwnerExecuteCapabilityStateCommand,
    mode: "once" | "grant",
  ): Promise<DispatchResult> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    const pending = await this._deps.capabilityStates.getByRequestId(command.vaultId, command.requestId);
    if (!pending || pending.status !== "PENDING") {
      throw new VaultCoreError("pending capability state not found", "VAULT_REQUEST_NOT_FOUND");
    }
    const issuedAt = this._deps.clock.nowIso();
    const capability: AgentCapability = {
      vaultId: this._deps.vaultId,
      agentId: pending.agentId,
      capabilityId: pending.capabilityId ?? this._deps.ids.newCapabilityId(),
      secretIds: pending.secretIds ? [...pending.secretIds] : undefined,
      secretAliases: pending.secretAliases ? [...pending.secretAliases] : (pending.secretAlias ? [pending.secretAlias] : []),
      operation: pending.operation,
      customFlowId: pending.customFlowId,
      scope: pending.targetUrl ?? pending.scope,
      methods: [...pending.methods],
      issuedAt,
      expiresAt: pending.expiresAt,
      rateLimit: pending.rateLimit,
      skipAudit: pending.skipAudit,
    };
    let result: DispatchResult;
    if (this._isExecutablePendingState(pending)) {
      result = await this.agentDispatchSecret({
        vaultId: this._deps.vaultId,
        agent: { kind: "agent", id: pending.agentId },
        capability,
        secretAlias: pending.secretAlias === "unknown" ? undefined : pending.secretAlias,
        targetUrl: pending.targetUrl,
        method: pending.methods[0] ?? "POST",
        headers: pending.headers,
        body: pending.body,
        proof: pending.proof,
        requestId: pending.requestId,
        requestedAt: pending.requestedAt,
      });
    } else if (mode === "grant") {
      result = {
        vaultId: this._deps.vaultId,
        requestId: pending.requestId ?? command.requestId,
        status: DispatchStatus.SUCCEEDED,
        targetUrl: pending.scope,
        method: pending.methods[0] ?? "POST",
      };
    } else {
      throw new VaultCoreError("pending capability state is not executable", "VAULT_WRITE_DENIED");
    }

    if (mode === "grant") {
      await this._deps.capabilityStates.upsert({
        ...pending,
        capabilityId: capability.capabilityId,
        status: "GRANTED",
        source: "owner_grant",
        issuedAt,
        decidedAt: issuedAt,
      });
      await this._appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          AuditAction.APPROVE_CAPABILITY_REQUEST,
          AuditOutcome.SUCCEEDED,
          `executed and granted capability state ${command.requestId}`,
          {
            requestId: command.requestId,
            agentId: pending.agentId,
            capabilityId: capability.capabilityId,
            operation: capability.operation,
          },
        ),
      );
    } else {
      await this._deps.capabilityStates.deleteByRequestId(command.vaultId, command.requestId);
      await this._appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          AuditAction.APPROVE_CAPABILITY_REQUEST,
          AuditOutcome.SUCCEEDED,
          `executed once and deleted capability state ${command.requestId}`,
          {
            requestId: command.requestId,
            agentId: pending.agentId,
            capabilityId: capability.capabilityId,
            operation: capability.operation,
          },
        ),
      );
    }

    return result;
  }

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
    const capabilities = (await this._deps.capabilityStates.list(this._deps.vaultId, agentId))
      .filter((state) => state.status === "GRANTED")
      .map((state) => this._stateToGrantedCapability(state));
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


  ownerOnCapabilityState(callback: (record: CapabilityStateRecord) => void): () => void {
    this._capabilityStateObservers.add(callback);
    return () => {
      this._capabilityStateObservers.delete(callback);
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
      await this._deps.capabilityStates.upsert({
        ...command.capability,
        status: "GRANTED",
        source: "owner_grant",
        requestId: undefined,
        requestedAt: command.capability.issuedAt,
      });
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

  async ownerSubmitCapabilityRequest(command: SubmitCapabilityRequestCommand): Promise<CapabilityStateRecord> {
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
    const pendingRecord: CapabilityStateRecord = {
      vaultId: this._deps.vaultId,
      status: "PENDING",
      source: "explicit_request",
      requestId: command.requestId,
      agentId: command.agentId,
      operation: command.scope.operation,
      secretAliases: command.scope.secretAliases ? [...command.scope.secretAliases] : [],
      scope: command.scope.scope,
      methods: [...command.scope.methods],
      rateLimit: command.scope.rateLimit,
      skipAudit: command.scope.skipAudit,
      expiresAt: command.scope.expiresAt,
      justification: command.justification,
      requestedAt: command.requestedAt,
    };
    await this._deps.capabilityStates.upsert(pendingRecord);

    for (const observer of this._capabilityStateObservers) {
      try {
        observer(pendingRecord);
      } catch (error) {
        console.error("VaultCore: error in capability state observer:", error);
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
    const state = await this._deps.capabilityStates.getByCapabilityId(vaultId, agentId, capabilityId);
    return state && state.status === "GRANTED" ? this._stateToGrantedCapability(state) : null;
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
      requestId: this._deps.ids.newRequestId("custom_flow_store"),
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

    const retiredAt = this._deps.clock.nowIso();
    await this._deps.secrets.save({
      ...record,
      updatedAt: retiredAt,
      retiredAt,
    });
    
    await this._appendAudit(
      toAuditEntry(this._deps, command.owner, AuditAction.DELETE_SECRET, AuditOutcome.SUCCEEDED, `retired secret ${command.alias}`, {
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

    const capabilities = (await this._deps.capabilityStates.list(this._deps.vaultId, request.agent.id))
      .filter((state) => state.status === "GRANTED")
      .map((state) => this._stateToGrantedCapability(state));
    const requestedCapabilityId = request.capability?.capabilityId;
    const candidateCapabilities = requestedCapabilityId
      ? capabilities.filter((cap) => cap.capabilityId === requestedCapabilityId)
      : capabilities;
    const capability = candidateCapabilities.find((cap) => this.isCapabilityMatch(cap, request, record?.secretId.value));

    const executorTarget = record
      ? record.targetBindings.find((binding) => binding.targetUrl === request.targetUrl)
        ?? record.targetBindings.find((binding) => binding.targetId === request.targetUrl)
        ?? null
      : null;

    if (!capability) {
      // It's a discovery case if the agent and secret exist but no capability matches
      const pendingRecord: CapabilityStateRecord = {
        vaultId: this._deps.vaultId,
        status: "PENDING",
        source: "dispatch_discovery",
        requestId: request.requestId,
        agentId: request.agent.id,
        capabilityId: undefined,
        operation: "dispatch_http",
        secretAliases: request.secretAlias ? [request.secretAlias] : [],
        scope: request.targetUrl,
        methods: [request.method],
        requestedAt: request.requestedAt,
        secretAlias: request.secretAlias ?? "unknown",
        targetUrl: request.targetUrl,
        headers: request.headers,
        body: request.body,
        proof: request.proof,
      };
      await this._deps.capabilityStates.upsert(pendingRecord);

      // Notify observers
      for (const observer of this._capabilityStateObservers) {
        try {
          observer(pendingRecord);
        } catch (error) {
          console.error("VaultCore: error in capability state observer:", error);
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

    try {
      await this._deps.policy.authorizeDispatch({
        ...request,
        capability,
      }, record);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this._appendDecisionAudit(request, AuditOutcome.DENIED, detail, {
        secretAlias: record?.alias.value ?? request.secretAlias,
        secretId: record?.secretId.value,
      });
      return {
        vaultId: this._deps.vaultId,
        decision: "deny",
        reason: detail,
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
    this._assertOwnerPrincipal(actor, "VAULT_AUDIT_DENIED");
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
    this._assertOwnerPrincipal(actor, "VAULT_AUDIT_DENIED");
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

  private isCapabilityMatch(capability: AgentCapability, request: DispatchRequest, secretId?: string): boolean {
    // Match either alias- or id-based capability grants when a secret is specified.
    if (request.secretAlias) {
      const aliasMatched = capability.secretAliases?.includes(request.secretAlias) ?? false;
      const idMatched = secretId ? (capability.secretIds?.includes(secretId) ?? false) : false;
      if (!aliasMatched && !idMatched) {
        return false;
      }
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
    const capabilities = (await this._deps.capabilityStates.list(this._deps.vaultId, agentId))
      .filter((state) => state.status === "GRANTED")
      .map((state) => this._stateToGrantedCapability(state));
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

  async agentListCapabilities(request: AgentListCapabilitiesRequest): Promise<readonly import("./contracts.js").AgentCapabilityState[]> {
    if (request.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("read vault mismatch", "VAULT_READ_DENIED");
    }
    await this._verifyAgentControlProof(request, "list_capabilities");
    return this._buildAgentCapabilityStates(request.agent.id);
  }

  async agentListSecrets(request: AgentListSecretsRequest): Promise<readonly AgentVisibleSecretRecord[]> {
    if (request.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("read vault mismatch", "VAULT_READ_DENIED");
    }
    await this._verifyAgentControlProof(request, "list_secrets");
    return this._listVisibleSecretsForAgent(request.agent.id);
  }

  async agentGetRuntimeManifest(command: AgentGetRuntimeManifestRequest): Promise<AgentRuntimeManifest> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("read vault mismatch", "VAULT_READ_DENIED");
    }
    await this._verifyAgentControlProof(command, "get_manifest");
    const agentRecord = await this._deps.agentIdentities.get(this._deps.vaultId, command.agent.id);
    if (!agentRecord) {
      throw new VaultCoreError("agent identity not registered", "VAULT_DISPATCH_DENIED");
    }
    const capabilities = await this._buildAgentCapabilityStates(command.agent.id);
    const vaultNickname = "CBIO Vault"; // TODO: Pull from profile if available
    
    return {
      agentId: command.agent.id,
      vaultId: this._deps.vaultId.value,
      vaultNickname,
      issuedAt: this._deps.clock.nowIso(),
      agent: {
        agentId: agentRecord.agentId,
        identityId: agentRecord.identityId,
        publicKey: agentRecord.publicKey,
        nickname: agentRecord.nickname,
        metadata: agentRecord.metadata,
      },
      capabilities,
      tools: getAgentToolbox(),
    };
  }

  async agentSubmitCapabilityRequest(command: AgentSubmitCapabilityRequestCommand): Promise<CapabilityStateRecord> {
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
    const existing = await this._deps.capabilityStates.getByCapabilityId(command.vaultId, command.agentId, command.capabilityId);
    if (!existing) {
      throw new VaultCoreError("capability not found", "VAULT_CAPABILITY_NOT_FOUND");
    }
    await this._deps.capabilityStates.upsert({
      ...existing,
      status: "REJECTED",
      decidedAt: this._deps.clock.nowIso(),
    });
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
        requestId: this._deps.ids.newRequestId("warmup_session_token"),
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

  async ownerListCapabilityStates(command: OwnerListCapabilityStatesRequest): Promise<readonly CapabilityStateRecord[]> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("read vault mismatch", "VAULT_READ_DENIED");
    }
    return (await this._deps.capabilityStates.list(command.vaultId, command.agentId))
      .filter((state) => !command.status || state.status === command.status);
  }

  async ownerExecuteCapabilityStateOnce(command: OwnerExecuteCapabilityStateCommand): Promise<DispatchResult> {
    return this._executePendingCapabilityState(command, "once");
  }

  async ownerExecuteCapabilityStateAndGrant(command: OwnerExecuteCapabilityStateCommand): Promise<DispatchResult> {
    return this._executePendingCapabilityState(command, "grant");
  }

  async ownerRejectCapabilityState(command: OwnerRejectCapabilityStateCommand): Promise<CapabilityStateRecord> {
    if (command.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("write vault mismatch", "VAULT_WRITE_DENIED");
    }
    const pending = await this._deps.capabilityStates.getByRequestId(command.vaultId, command.requestId);
    if (!pending || pending.status !== "PENDING") {
      throw new VaultCoreError("pending capability state not found", "VAULT_REQUEST_NOT_FOUND");
    }

    const rejectedState: CapabilityStateRecord = {
      ...pending,
      status: "REJECTED",
      decidedAt: this._deps.clock.nowIso(),
    };
    await this._deps.capabilityStates.upsert(rejectedState);
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
          operation: pending.operation,
        },
      ),
    );
    return rejectedState;
  }
}

export function createVaultCore(deps: VaultCoreDependencies): VaultCore {
  return new VaultCore(deps);
}
