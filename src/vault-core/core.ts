import type {
  AuditEntry,
  AuditQuery,
  CustomHttpFlowDefinition,
  DispatchAuthorization,
  DispatchRequest,
  DispatchResult,
  OwnerDefineSecretTargetsCommand,
  OwnerDeleteSecretCommand,
  OwnerExportSecretRequest,
  OwnerRegisterCapabilityCommand,
  OwnerRegisterAgentIdentityCommand,
  OwnerRegisterCustomHttpFlowCommand,
  OwnerSecretExport,
  SecretRecord,
  VaultPrincipal,
  VaultWriteSecretCommand,
} from "./contracts.js";
import type { VaultCore, VaultCoreDependencies } from "./ports.js";
import { VaultCoreError } from "./errors.js";

function toAuditEntry(
  deps: VaultCoreDependencies,
  actor: VaultPrincipal,
  action: AuditEntry["action"],
  outcome: AuditEntry["outcome"],
  detail: string,
  options?: {
    requestId?: string;
    capabilityId?: string;
    operation?: AuditEntry["operation"];
    targetUrl?: string;
    secretAlias?: string;
    secretId?: string;
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

export class DefaultVaultCore implements VaultCore {
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
    outcome: "allowed" | "denied",
    detail: string,
    options?: {
      secretAlias?: string;
      secretId?: string;
    },
  ): Promise<void> {
    await this.appendAudit(
      toAuditEntry(this._deps, request.agent, "authorize_dispatch", outcome, detail, {
        requestId: request.requestId,
        capabilityId: request.capability.capabilityId,
        operation: request.capability.operation,
        targetUrl: request.targetUrl,
        secretAlias: options?.secretAlias ?? request.secretAlias,
        secretId: options?.secretId,
      }),
    );
  }

  async bootstrapOwnerIdentity(identity: import("./contracts.js").OwnerIdentityRecord): Promise<void> {
    if (identity.vaultId.value !== this._deps.vaultId.value) {
      throw new VaultCoreError("owner identity vault mismatch", "VAULT_IDENTITY_DENIED");
    }
    if (await this._deps.ownerIdentities.hasAny(this._deps.vaultId)) {
      throw new VaultCoreError("owner bootstrap already completed", "VAULT_IDENTITY_DENIED");
    }
    await this._deps.ownerIdentities.register(identity);
    await this.appendAudit(
      toAuditEntry(
        this._deps,
        { kind: "owner", id: identity.ownerId },
        "bootstrap_owner_identity",
        "succeeded",
        "initial owner identity bootstrapped",
      ),
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
      await this._deps.ownerProofVerifier.verifyRegisterAgentIdentity(command);
      await this._deps.agentIdentities.register(command.agentIdentity);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          "register_agent_identity",
          "succeeded",
          `agent identity registered: ${command.agentIdentity.agentId}`,
        ),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          "register_agent_identity",
          "denied",
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
      await this._deps.ownerProofVerifier.verifyRegisterCapability(command);
      await this._deps.capabilities.register(command.capability);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          "register_capability",
          "succeeded",
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
          "register_capability",
          "denied",
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
      await this._deps.ownerProofVerifier.verifyRegisterCustomFlow(command);
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
          "register_custom_flow",
          "succeeded",
          `custom http flow registered: ${command.flow.flowId}`,
        ),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          "register_custom_flow",
          "denied",
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
          "reassign_alias",
          "denied",
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
      proof: {
        ownerId: actor.id,
        requestId: `${flow.flowId}:${alias}:custom_flow_store`,
        requestedAt: this._deps.clock.nowIso(),
        signature: "vault-internal",
      },
    });
    try {
      await this._deps.custody.store(record.secretId, plaintext);
      await this._deps.secrets.save(record);
      await this.appendAudit(
        toAuditEntry(this._deps, actor, "write_secret", "succeeded", `custom flow stored secret: ${alias}`, {
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
      if (command.kind === "owner.write_secret") {
        await this._deps.ownerProofVerifier.verifyWrite(command);
      }
      await this._deps.policy.authorizeWrite(command);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.kind === "owner.write_secret" ? command.owner : command.issuer,
          "write_secret",
          "denied",
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
          "reassign_alias",
          "denied",
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
        toAuditEntry(this._deps, command.kind === "owner.write_secret" ? command.owner : command.issuer, "write_secret", "succeeded", "secret stored", {
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
    await this._deps.ownerProofVerifier.verifyDeleteSecret?.(command);
    
    const record = await this._deps.secrets.getByAlias({ value: command.alias });
    if (!record) {
      throw new VaultCoreError(`secret not found: ${command.alias}`, "VAULT_SECRET_NOT_FOUND");
    }

    await this._deps.secrets.delete(record.secretId);
    await this._deps.custody.delete(record.secretId);
    
    await this.appendAudit(
      toAuditEntry(this._deps, command.owner, "delete_secret", "succeeded", `deleted secret ${command.alias}`, {
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
      await this._deps.ownerProofVerifier.verifyDefineSecretTargets(command);
      await this._deps.policy.authorizeDefineSecretTargets(command);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendAudit(
        toAuditEntry(
          this._deps,
          command.owner,
          "define_secret_targets",
          "denied",
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
        toAuditEntry(this._deps, command.owner, "define_secret_targets", "denied", error.message, {
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
      toAuditEntry(this._deps, command.owner, "define_secret_targets", "succeeded", "secret targets defined", {
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
      await this.appendDecisionAudit(request, "denied", "secret not found");
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
      await this._deps.proofVerifier.verify(request);
      await this._deps.policy.authorizeDispatch(request, record);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.appendDecisionAudit(request, "denied", detail, {
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

    if (request.capability.auditRequired !== false) {
      await this.appendDecisionAudit(request, "allowed", "dispatch authorized", {
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
    if (authorization.decision !== "allow" || !authorization.secretId) {
      throw new VaultCoreError("dispatch denied", "VAULT_DISPATCH_DENIED");
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
        "dispatch_secret",
        result.status === "succeeded" ? "succeeded" : "failed",
        result.status === "succeeded" ? "dispatch completed" : (result.error ?? "dispatch failed"),
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
    if (!request) {
      throw new VaultCoreError("owner audit proof required", "VAULT_AUDIT_DENIED");
    }
    await this._deps.ownerProofVerifier.verifyAudit({
      vaultId: this._deps.vaultId,
      actor,
      query,
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      proof: request.proof,
    });
    const entries = await this._deps.audit.query(query);
    await this.appendAudit(
      toAuditEntry(this._deps, actor, "read_audit", "allowed", "audit queried"),
    );
    return entries;
  }

  async exportSecret(
    actor: VaultPrincipal & { kind: "owner" },
    alias: string,
    request?: Omit<OwnerExportSecretRequest, "actor" | "alias" | "vaultId">,
  ): Promise<OwnerSecretExport> {
    if (!request) {
      throw new VaultCoreError("owner export proof required", "VAULT_AUDIT_DENIED");
    }
    try {
      await this._deps.ownerProofVerifier.verifyExport({
        vaultId: this._deps.vaultId,
        actor,
        alias,
        requestId: request.requestId,
        requestedAt: request.requestedAt,
        proof: request.proof,
      });
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
        toAuditEntry(this._deps, actor, "export_secret", "succeeded", "secret exported", {
          requestId: request.requestId,
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
        toAuditEntry(this._deps, actor, "export_secret", "denied", detail, {
          requestId: request.requestId,
          secretAlias: alias,
        }),
      );
      throw error;
    }
  }
}

export function createVaultCore(deps: VaultCoreDependencies): VaultCore {
  return new DefaultVaultCore(deps);
}
