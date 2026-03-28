import {
  AuditAction,
  AuditOutcome,
  DispatchStatus,
  type AgentIdentityRecord,
  type AgentRuntimeManifest,
  type AgentVisibleRequestRecord,
  type AgentVisibleSecretRecord,
  type AuditEntry,
  type AuditQuery,
  type CustomHttpFlowDefinition,
  type DispatchAuthorization,
  type DispatchDecision,
  type DispatchInstruction,
  type DispatchRequest,
  type DispatchResult,
  type OwnerRequestRecord,
  type OwnerVisibleRequestRecord,
  type RequestRecord,
  type SecretId,
  type SecretRecord,
  type StoredSessionToken,
  type VaultId,
  type VaultPrincipal,
  type AgentSecretGrant,
  type SecretDestinationGrant,
  type DispatchApprovalDecision,
  type OwnerCreateSecretCommand,
  type OwnerUpdateSecretCommand,
  type OwnerSecretExport,
  type OwnerSessionToken,
} from "./contracts.js";
import { type VaultCoreErrorCode, VaultCoreError } from "./errors.js";
import type { VaultCoreDependencies } from "./ports.js";
import { applyResponseReadPolicy } from "./read-policy.js";
import { getAgentToolbox } from "./tool-metadata.js";
import { InMemoryRequestRecordRegistry } from "./defaults.js";

function isScopeMatch(scope: string, url: string): boolean {
  if (scope === "*") return true;
  const regex = new RegExp("^" + scope.replace(/\*/g, ".*") + "$");
  return regex.test(url);
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

function toAuditEntry(
  deps: VaultCoreDependencies,
  actor: VaultPrincipal,
  action: AuditAction,
  outcome: AuditOutcome,
  detail: string,
  extra: Partial<AuditEntry> = {},
): AuditEntry {
  return {
    entryId: deps.ids.newAuditEntryId(),
    occurredAt: deps.clock.nowIso(),
    vaultId: deps.vaultId,
    actor,
    action,
    outcome,
    detail,
    ...extra,
  };
}

export class VaultCore {
  private readonly _deps: VaultCoreDependencies;

  constructor(deps: VaultCoreDependencies) {
    this._deps = deps;
  }

  get vaultId() {
    return this._deps.vaultId;
  }

  private _assertOwnerPrincipal(actor: VaultPrincipal, errorCode: VaultCoreErrorCode = "VAULT_ACCESS_DENIED") {
    if (actor.kind !== "owner") {
      throw new VaultCoreError("owner principal required", errorCode);
    }
  }

  private async _appendAudit(entry: AuditEntry) {
    await this._deps.audit.append(entry);
  }

  private async _verifyAgentControlProof(
    command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; requestId: string; requestedAt: string },
    actionName: string,
    extraAudit: Record<string, any> = {},
  ) {
    try {
      await this._deps.agentProofVerifier.verify(command as any);
      await this._deps.replayGuard.assertNotReplayed(command as any);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this._appendAudit(
        toAuditEntry(this._deps, command.agent, AuditAction.EVALUATE_DISPATCH_POLICY, AuditOutcome.DENIED, `proof verification failed: ${detail}`, {
          requestId: command.requestId,
          ...extraAudit,
        }),
      );
      throw error;
    }
  }

  // ─── Grant Management ─────────────────────────────────────────────────────────

  async ownerGrantAgentSecret(
    actor: VaultPrincipal & { kind: "owner" },
    rootAgentId: string,
    secretAlias: string,
    request?: { requestId?: string },
  ): Promise<AgentSecretGrant> {
    this._assertOwnerPrincipal(actor);
    const now = this._deps.clock.nowIso();
    const grant: AgentSecretGrant = {
      vaultId: this._deps.vaultId,
      rootAgentId,
      secretAlias,
      status: "approved",
      requestedAt: now,
      grantedAt: now,
    };
    await this._deps.agentSecretGrants.upsert(grant);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.GRANT_AGENT_SECRET, AuditOutcome.SUCCEEDED, `granted secret "${secretAlias}" to agent "${rootAgentId}"`, {
        requestId: request?.requestId,
        rootAgentId,
        secretAlias,
      }),
    );
    return grant;
  }

  async ownerGrantSecretDestination(
    actor: VaultPrincipal & { kind: "owner" },
    secretAlias: string,
    domain: string,
    request?: { requestId?: string },
  ): Promise<SecretDestinationGrant> {
    this._assertOwnerPrincipal(actor);
    const now = this._deps.clock.nowIso();
    const grant: SecretDestinationGrant = {
      vaultId: this._deps.vaultId,
      secretAlias,
      domain,
      status: "approved",
      requestedAt: now,
      grantedAt: now,
    };
    await this._deps.secretDestinationGrants.upsert(grant);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.GRANT_SECRET_DESTINATION, AuditOutcome.SUCCEEDED, `granted destination "${domain}" for secret "${secretAlias}"`, {
        requestId: request?.requestId,
        secretAlias,
        domain,
      }),
    );
    return grant;
  }

  async ownerRevokeAgentSecret(
    actor: VaultPrincipal & { kind: "owner" },
    rootAgentId: string,
    secretAlias: string,
    request?: { requestId?: string },
  ): Promise<void> {
    this._assertOwnerPrincipal(actor);
    await this._deps.agentSecretGrants.delete(this._deps.vaultId, rootAgentId, secretAlias);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.REVOKE_AGENT_SECRET, AuditOutcome.SUCCEEDED, `revoked secret "${secretAlias}" from agent "${rootAgentId}"`, {
        requestId: request?.requestId,
        rootAgentId,
        secretAlias,
      }),
    );
  }

  async ownerRevokeSecretDestination(
    actor: VaultPrincipal & { kind: "owner" },
    secretAlias: string,
    domain: string,
    request?: { requestId?: string },
  ): Promise<void> {
    this._assertOwnerPrincipal(actor);
    await this._deps.secretDestinationGrants.delete(this._deps.vaultId, secretAlias, domain);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.REVOKE_SECRET_DESTINATION, AuditOutcome.SUCCEEDED, `revoked destination "${domain}" from secret "${secretAlias}"`, {
        requestId: request?.requestId,
        secretAlias,
        domain,
      }),
    );
  }

  async ownerListGrants(
    actor: VaultPrincipal & { kind: "owner" },
    rootAgentId?: string,
    secretAlias?: string,
  ) {
    this._assertOwnerPrincipal(actor);
    const [agentSecrets, secretDestinations] = await Promise.all([
      this._deps.agentSecretGrants.list(this._deps.vaultId, rootAgentId),
      this._deps.secretDestinationGrants.list(this._deps.vaultId, secretAlias),
    ]);
    return { agentSecrets, secretDestinations };
  }

  // ─── Dispatch Authorization ───────────────────────────────────────────────────

  async agentAuthorizeDispatch(request: DispatchRequest): Promise<DispatchAuthorization> {
    const { agent, secretAlias, targetUrl } = request;

    if (!secretAlias) {
      return { vaultId: this._deps.vaultId, decision: "deny", reason: "secretAlias required", secretId: null };
    }

    const secret = await this._deps.secrets.getByAlias({ value: secretAlias });
    if (!secret) {
      return { vaultId: this._deps.vaultId, decision: "deny", reason: `secret not found: ${secretAlias}`, secretId: null };
    }

    // 1. Check Agent-Secret Grant
    const agentSecretGrant = await this._deps.agentSecretGrants.get(this._deps.vaultId, agent.id, secretAlias);
    const agentSecretApproved = agentSecretGrant?.status === "approved";

    // 2. Check Secret-Destination Grant
    const domain = extractDomain(targetUrl);
    const destGrant = await this._deps.secretDestinationGrants.get(this._deps.vaultId, secretAlias, domain);
    const destApproved = destGrant?.status === "approved";

    if (agentSecretApproved && destApproved) {
      return { vaultId: this._deps.vaultId, decision: "allow", reason: "granted", secretId: secret.secretId };
    }

    const missingGrants = {
      agentSecret: !agentSecretApproved,
      secretDestination: !destApproved,
    };

    return {
      vaultId: this._deps.vaultId,
      decision: "pending",
      reason: "pending approval",
      secretId: secret.secretId,
      missingGrants,
    };
  }

  async agentDispatchSecret(request: DispatchRequest): Promise<DispatchResult> {
    await this._verifyAgentControlProof(request, "dispatch");

    const authorization = await this.agentAuthorizeDispatch(request);

    if (authorization.decision === "deny") {
      const result: DispatchResult = {
        vaultId: this._deps.vaultId,
        requestId: request.requestId,
        status: DispatchStatus.DENIED,
        targetUrl: request.targetUrl,
        method: request.method,
        error: authorization.reason ?? "denied",
      };
      await this._appendAudit(
        toAuditEntry(this._deps, request.agent, AuditAction.EVALUATE_DISPATCH_POLICY, AuditOutcome.DENIED, authorization.reason ?? "denied", {
          requestId: request.requestId,
          targetUrl: request.targetUrl,
          secretAlias: request.secretAlias,
        }),
      );
      await this._recordRequestInternal(request, result);
      return result;
    }

    if (authorization.decision === "pending") {
      const result: DispatchResult = {
        vaultId: this._deps.vaultId,
        requestId: request.requestId,
        status: DispatchStatus.PENDING,
        targetUrl: request.targetUrl,
        method: request.method,
      };
      await this._appendAudit(
        toAuditEntry(this._deps, request.agent, AuditAction.PENDING_DISPATCH_APPROVAL, AuditOutcome.ALLOWED, "request held for human approval", {
          requestId: request.requestId,
          targetUrl: request.targetUrl,
          secretAlias: request.secretAlias,
        }),
      );
      await this._recordRequestInternal(request, result, authorization.missingGrants);
      return result;
    }

    // Proceed with dispatch
    const secretId = authorization.secretId!;
    const secretRecord = await this._deps.secrets.getById(secretId);
    if (!secretRecord) {
      throw new VaultCoreError("secret record not found after authorization", "VAULT_INTERNAL_ERROR");
    }

    const plaintext = await this._deps.custody.load(secretId);
    if (plaintext === null) {
      throw new VaultCoreError("secret material not found", "VAULT_SECRET_NOT_FOUND");
    }

    const result = await this._deps.executor.dispatch(
      {
        vaultId: this._deps.vaultId,
        requestId: request.requestId,
        secretId: secretId,
        targetUrl: request.targetUrl,
        method: request.method,
        headers: request.headers,
        body: request.body,
      },
      { record: secretRecord, plaintext },
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
          targetUrl: request.targetUrl,
          secretAlias: request.secretAlias,
          secretId: secretId.value,
        },
      ),
    );

    await this._recordRequestInternal(request, result);

    return {
      ...result,
      vaultId: this._deps.vaultId,
      responseBody: undefined, // Hide body in direct return
    };
  }

  // ─── Pending Approval ─────────────────────────────────────────────────────────

  async ownerApproveDispatch(
    actor: VaultPrincipal & { kind: "owner" },
    requestId: string,
    decision: DispatchApprovalDecision,
  ): Promise<DispatchResult | null> {
    this._assertOwnerPrincipal(actor);
    const record = await this._deps.requests.get(this._deps.vaultId, requestId);
    if (!record) {
      throw new VaultCoreError("request record not found", "VAULT_REQUEST_NOT_FOUND");
    }

    if (record.execution.status !== DispatchStatus.PENDING) {
      throw new VaultCoreError("request is not pending", "VAULT_REQUEST_NOT_PENDING");
    }

    if (decision === "deny") {
      const updated: RequestRecord = {
        ...record,
        execution: { status: DispatchStatus.DENIED },
      };
      await this._deps.requests.save(updated);
      await this._appendAudit(
        toAuditEntry(this._deps, actor, AuditAction.REJECT_DISPATCH, AuditOutcome.SUCCEEDED, "dispatch rejected by owner", {
          requestId,
          rootAgentId: record.rootAgentId,
        }),
      );
      return null;
    }

    const secretAlias = record.request.secretAlias;
    if (!secretAlias) {
      throw new VaultCoreError("record missing secretAlias", "VAULT_INTERNAL_ERROR");
    }

    const secret = await this._deps.secrets.getByAlias({ value: secretAlias });
    if (!secret) {
      throw new VaultCoreError("secret not found during approval", "VAULT_SECRET_NOT_FOUND");
    }

    // Auto-grant if requested
    if (decision === "allow_and_grant") {
      const now = this._deps.clock.nowIso();
      const domain = extractDomain(record.request.targetUrl);

      await Promise.all([
        this._deps.agentSecretGrants.upsert({
          vaultId: this._deps.vaultId,
          rootAgentId: record.rootAgentId,
          secretAlias,
          status: "approved",
          requestedAt: now,
          grantedAt: now,
        }),
        this._deps.secretDestinationGrants.upsert({
          vaultId: this._deps.vaultId,
          secretAlias,
          domain,
          status: "approved",
          requestedAt: now,
          grantedAt: now,
        }),
      ]);

      await this._appendAudit(
        toAuditEntry(this._deps, actor, AuditAction.GRANT_AGENT_SECRET, AuditOutcome.SUCCEEDED, "granted during dispatch approval", {
          rootAgentId: record.rootAgentId,
          secretAlias,
        }),
      );
      await this._appendAudit(
        toAuditEntry(this._deps, actor, AuditAction.GRANT_SECRET_DESTINATION, AuditOutcome.SUCCEEDED, "granted during dispatch approval", {
          secretAlias,
          domain,
        }),
      );
    }

    // Execute
    const plaintext = await this._deps.custody.load(secret.secretId);
    if (plaintext === null) {
      throw new VaultCoreError("secret material not found", "VAULT_SECRET_NOT_FOUND");
    }

    const result = await this._deps.executor.dispatch(
      {
        vaultId: this._deps.vaultId,
        requestId,
        secretId: secret.secretId,
        targetUrl: record.request.targetUrl,
        method: record.request.method,
        headers: record.request.headers,
        body: record.request.body,
      },
      { record: secret, plaintext },
    );

    const finalRecord: RequestRecord = {
      ...record,
      response: {
        status: result.responseStatus,
        body: result.responseBody,
        error: result.error,
      },
      execution: { status: result.status },
    };
    await this._deps.requests.save(finalRecord);

    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditAction.APPROVE_DISPATCH, AuditOutcome.SUCCEEDED, `dispatch approved (${decision})`, {
        requestId,
        rootAgentId: record.rootAgentId,
      }),
    );

    return result;
  }

  // ─── Agent Control APIs ───────────────────────────────────────────────────────

  async agentGetRuntimeManifest(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; requestId: string; requestedAt: string }): Promise<AgentRuntimeManifest> {
    await this._verifyAgentControlProof(command, "get_manifest");

    const agentRecord = await this._deps.agentRecords.get(this._deps.vaultId, command.agent.id);
    if (!agentRecord) {
      throw new VaultCoreError("agent.identity not registered", "VAULT_DISPATCH_DENIED");
    }

    const [agentSecrets, secretDestinations] = await Promise.all([
      this._deps.agentSecretGrants.list(this._deps.vaultId, command.agent.id),
      this._deps.secretDestinationGrants.list(this._deps.vaultId), // All destination grants for these secrets? Or just a subset? 
      // For simplicity, return all destinations that mention a secret the agent has a grant for.
    ]);

    const secretAliases = new Set(agentSecrets.map(g => g.secretAlias));
    const relevantDestinations = secretDestinations.filter(d => secretAliases.has(d.secretAlias));

    return {
      rootAgentId: command.agent.id,
      vaultId: this._deps.vaultId.value,
      issuedAt: this._deps.clock.nowIso(),
      agent: {
        rootAgentId: agentRecord.rootAgentId,
                publicKey: agentRecord.publicKey,
        nickname: agentRecord.nickname,
        metadata: agentRecord.metadata,
      },
      grants: {
        agentSecrets: agentSecrets.filter(g => g.status === "approved"),
        secretDestinations: relevantDestinations.filter(d => d.status === "approved"),
      },
      tools: getAgentToolbox(),
    };
  }

  async agentListSecrets(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; requestId: string; requestedAt: string }): Promise<readonly AgentVisibleSecretRecord[]> {
    await this._verifyAgentControlProof(command, "list_secrets");
    const records = await this._deps.secrets.list(this._deps.vaultId);
    const grants = await this._deps.agentSecretGrants.list(this._deps.vaultId, command.agent.id);
    const approvedAliases = new Set(grants.filter(g => g.status === "approved").map(g => g.secretAlias));

    return records.map(record => ({
      vaultId: record.vaultId,
      secretId: record.secretId,
      alias: record.alias,
      version: record.version,
      lifecycleStatus: record.lifecycleStatus ?? "ACTIVE",
      issuerId: record.issuerId,
      source: record.source,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      granted: approvedAliases.has(record.alias.value),
    }));
  }

  async agentListRequests(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; requestId: string; requestedAt: string }): Promise<readonly AgentVisibleRequestRecord[]> {
    await this._verifyAgentControlProof(command, "list_requests");
    const records = await this._deps.requests.list(this._deps.vaultId, command.agent.id);
    return records.map(r => this.toAgentVisibleRequestRecord(r));
  }

  async agentGetRequest(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; requestId: string; requestedAt: string; targetRequestId: string }): Promise<any> {
    await this._verifyAgentControlProof(command, "read_request");
    const record = await this._deps.requests.get(this._deps.vaultId, command.targetRequestId);
    if (!record || record.rootAgentId !== command.agent.id) {
      throw new VaultCoreError("request record not found", "VAULT_READ_DENIED");
    }

    // By default, no read-policy is granted anymore in this simplified model.
    // However, if we wanted to support some response visibility, we'd need another grant table.
    // For now, let's assume agent can see their own requested status but not necessarily the body 
    // unless they have a specific grant (omitted for now to focus on dispatch).
    const parsedResponseBody = applyResponseReadPolicy(record.response?.body, { paths: [] });

    return {
      requestId: record.requestId,
      executionStatus: record.execution.status,
      responseStatus: record.response?.status,
      responseBody: parsedResponseBody,
      error: record.response?.error,
    };
  }

  // ─── Owner Management APIs ────────────────────────────────────────────────────

  async ownerRegisterAgentIdentity(command: { vaultId: VaultId; requestId: string; owner: VaultPrincipal; agentRecord: AgentIdentityRecord; requestedAt: string }) {
    this._assertOwnerPrincipal(command.owner);
    await this._deps.agentRecords.register(command.agentRecord);
    await this._appendAudit(toAuditEntry(this._deps, command.owner, AuditAction.REGISTER_AGENT_IDENTITY, AuditOutcome.SUCCEEDED, `agent identity registered: "${command.agentRecord.rootAgentId}"`, { rootAgentId: command.agentRecord.rootAgentId }));
  }

  async ownerUpdateAgentIdentity(command: { vaultId: VaultId; requestId: string; owner: VaultPrincipal; rootAgentId: string; nickname?: string; metadata?: Record<string, any>; requestedAt: string }): Promise<AgentIdentityRecord> {
    this._assertOwnerPrincipal(command.owner);
    const existing = await this._deps.agentRecords.get(command.vaultId, command.rootAgentId);
    if (!existing) throw new VaultCoreError("agent identity not found", "VAULT_IDENTITY_NOT_FOUND");
    const updated = { ...existing, nickname: command.nickname ?? existing.nickname, metadata: command.metadata ?? existing.metadata };
    await this._deps.agentRecords.register(updated);
    await this._appendAudit(toAuditEntry(this._deps, command.owner, AuditAction.UPDATE_AGENT_IDENTITY, AuditOutcome.SUCCEEDED, `agent identity updated: "${command.rootAgentId}"`, { rootAgentId: command.rootAgentId }));
    return updated;
  }

  async ownerCreateSecret(command: OwnerCreateSecretCommand): Promise<SecretRecord> {
    this._assertOwnerPrincipal(command.owner);
    await this._deps.policy.authorizeWrite(command);
    const secretId = this._deps.ids.newSecretId();
    const now = this._deps.clock.nowIso();
    const record: SecretRecord = {
      vaultId: command.vaultId,
      secretId,
      alias: { value: command.alias },
      version: this._deps.ids.newVersion(),
      lifecycleStatus: "ACTIVE",
      issuerId: null,
      source: command.source ? (command.source.kind === "request" ? { kind: "request", requestId: command.source.requestId! } : { kind: "manual" }) : { kind: "manual" },
      createdAt: now,
      updatedAt: now,
    };
    await this._deps.secrets.save(record);
    await this._deps.custody.store(secretId, command.plaintext);
    await this._appendAudit(toAuditEntry(this._deps, command.owner, AuditAction.WRITE_SECRET, AuditOutcome.SUCCEEDED, `secret created: "${command.alias}"`, { secretAlias: command.alias, secretId: secretId.value }));
    return record;
  }

  async ownerUpdateSecret(command: OwnerUpdateSecretCommand): Promise<SecretRecord> {
    this._assertOwnerPrincipal(command.owner);
    await this._deps.policy.authorizeWrite(command);
    const existing = await this._deps.secrets.getByAlias({ value: command.alias });
    if (!existing) throw new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");
    const secretId = existing.secretId;
    const now = this._deps.clock.nowIso();
    const record: SecretRecord = {
      ...existing,
      version: this._deps.ids.newVersion(),
      updatedAt: now,
    };
    await this._deps.secrets.save(record);
    await this._deps.custody.store(secretId, command.plaintext);
    await this._appendAudit(toAuditEntry(this._deps, command.owner, AuditAction.WRITE_SECRET, AuditOutcome.SUCCEEDED, `secret updated: "${command.alias}"`, { secretAlias: command.alias, secretId: secretId.value }));
    return record;
  }

  async ownerRemoveSecret(command: { kind: "owner.remove_secret"; vaultId: VaultId; requestId: string; owner: VaultPrincipal; alias: string; requestedAt: string }) {
    this._assertOwnerPrincipal(command.owner);
    const record = await this._deps.secrets.getByAlias({ value: command.alias });
    if (!record) throw new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");
    await this._deps.secrets.delete(record.secretId);
    await this._deps.custody.delete(record.secretId);
    await this._appendAudit(toAuditEntry(this._deps, command.owner, AuditAction.DELETE_SECRET, AuditOutcome.SUCCEEDED, `secret deleted: "${command.alias}"`, { secretAlias: command.alias, secretId: record.secretId.value }));
  }

  async ownerWriteSecret(command: any): Promise<SecretRecord> {
    this._assertOwnerPrincipal(command.owner ?? command.issuer);
    await this._deps.policy.authorizeWrite(command);
    const existing = await this._deps.secrets.getByAlias({ value: command.alias });
    const secretId = existing ? existing.secretId : this._deps.ids.newSecretId();
    const now = this._deps.clock.nowIso();
    const record: SecretRecord = {
      vaultId: command.vaultId,
      secretId,
      alias: { value: command.alias },
      version: this._deps.ids.newVersion(),
      lifecycleStatus: "ACTIVE",
      issuerId: command.issuer?.id ?? null,
      source: command.source,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    await this._deps.secrets.save(record);
    await this._deps.custody.store(secretId, command.plaintext);
    // Generic write doesn't have a specific audit message here, assuming it's called by Create/Update which do their own audit.
    // However, if called directly:
    if (!existing) {
       await this._appendAudit(toAuditEntry(this._deps, command.owner ?? command.issuer, AuditAction.WRITE_SECRET, AuditOutcome.SUCCEEDED, `secret created via generic write: "${command.alias}"`, { secretAlias: command.alias, secretId: secretId.value }));
    } else {
       await this._appendAudit(toAuditEntry(this._deps, command.owner ?? command.issuer, AuditAction.WRITE_SECRET, AuditOutcome.SUCCEEDED, `secret updated via generic write: "${command.alias}"`, { secretAlias: command.alias, secretId: secretId.value }));
    }
    return record;
  }

  async ownerReadAudit(actor: VaultPrincipal & { kind: "owner" }, query: AuditQuery): Promise<readonly AuditEntry[]> {
    this._assertOwnerPrincipal(actor);
    const entries = await this._deps.audit.query(query);
    await this._appendAudit(toAuditEntry(this._deps, actor, AuditAction.READ_AUDIT, AuditOutcome.SUCCEEDED, "audit log accessed", { detail: JSON.stringify(query) }));
    return entries;
  }

  async ownerExportSecret(actor: VaultPrincipal & { kind: "owner" }, alias: string): Promise<OwnerSecretExport> {
    this._assertOwnerPrincipal(actor);
    const record = await this._deps.secrets.getByAlias({ value: alias });
    if (!record) throw new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");
    const plaintext = await this._deps.custody.load(record.secretId);
    if (plaintext === null) throw new VaultCoreError("secret material not found", "VAULT_SECRET_NOT_FOUND");
    await this._appendAudit(toAuditEntry(this._deps, actor, AuditAction.EXPORT_SECRET, AuditOutcome.SUCCEEDED, `secret exported as plaintext: "${alias}"`, { secretAlias: alias, secretId: record.secretId.value }));
    return { vaultId: this._deps.vaultId, secretId: record.secretId, alias: record.alias, plaintext, exportedAt: this._deps.clock.nowIso() };
  }

  async ownerListAgents(actor: VaultPrincipal & { kind: "owner" }): Promise<readonly AgentIdentityRecord[]> {
    this._assertOwnerPrincipal(actor);
    const identities = await this._deps.agentRecords.list(this._deps.vaultId);
    const sessionTokens = await this._deps.sessionTokens.list();
    const tokensByAgentId = new Map<string, StoredSessionToken[]>();
    for (const st of sessionTokens) {
      const list = tokensByAgentId.get(st.rootAgentId) ?? [];
      list.push(st);
      tokensByAgentId.set(st.rootAgentId, list);
    }
    const result = identities.map(id => ({ ...id, sessionTokens: tokensByAgentId.get(id.rootAgentId) ?? [] }));
    await this._appendAudit(toAuditEntry(this._deps, actor, AuditAction.LIST_AGENTS, AuditOutcome.SUCCEEDED, "agent identity list accessed"));
    return result;
  }

  async ownerListRequests(actor: VaultPrincipal & { kind: "owner" }, rootAgentId?: string): Promise<readonly OwnerVisibleRequestRecord[]> {
    this._assertOwnerPrincipal(actor);
    const records = await this._deps.requests.list(this._deps.vaultId, rootAgentId);
    await this._appendAudit(toAuditEntry(this._deps, actor, AuditAction.LIST_REQUESTS, AuditOutcome.SUCCEEDED, "request list accessed"));
    return records.map(r => this.toOwnerVisibleRequestRecord(r));
  }

  async ownerGetRequest(actor: VaultPrincipal & { kind: "owner" }, requestId: string): Promise<OwnerRequestRecord> {
    this._assertOwnerPrincipal(actor);
    const record = await this._deps.requests.get(this._deps.vaultId, requestId);
    if (!record) throw new VaultCoreError("request record not found", "VAULT_REQUEST_NOT_FOUND");
    const result = this.toOwnerRequestRecord(record);
    await this._appendAudit(toAuditEntry(this._deps, actor, AuditAction.READ_REQUEST, AuditOutcome.SUCCEEDED, `dispatch request detailed: "${requestId}"`, { requestId }));
    return result;
  }

  async ownerListSecrets(actor: VaultPrincipal & { kind: "owner" }): Promise<readonly AgentVisibleSecretRecord[]> {
    this._assertOwnerPrincipal(actor);
    const records = await this._deps.secrets.list(this._deps.vaultId);
    await this._appendAudit(toAuditEntry(this._deps, actor, AuditAction.LIST_SECRETS, AuditOutcome.SUCCEEDED, "secret list accessed"));
    return records.map(r => ({
      vaultId: r.vaultId,
      secretId: r.secretId,
      alias: r.alias,
      version: r.version,
      lifecycleStatus: r.lifecycleStatus ?? "ACTIVE",
      issuerId: r.issuerId,
      source: r.source,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      granted: true,
    }));
  }

  async ownerIssueSessionToken(request: { vaultId: VaultId; actor: VaultPrincipal; rootAgentId: string }) {
    this._assertOwnerPrincipal(request.actor);
    const token = await this._deps.sessionTokens.issue(request.rootAgentId);
    await this._appendAudit(toAuditEntry(this._deps, request.actor, AuditAction.ISSUE_SESSION_TOKEN, AuditOutcome.SUCCEEDED, `session token issued for agent: "${request.rootAgentId}"`, { rootAgentId: request.rootAgentId }));
    return { token, rootAgentId: request.rootAgentId, issuedAt: this._deps.clock.nowIso() };
  }

  async ownerIssueAllAgentSessionTokens(actor: VaultPrincipal & { kind: "owner" }) {
    this._assertOwnerPrincipal(actor);
    const agents = await this.ownerListAgents(actor);
    return Promise.all(agents.map(a => this.ownerIssueSessionToken({ vaultId: this._deps.vaultId, actor, rootAgentId: a.rootAgentId })));
  }

  async ownerRevokeSessionToken(request: { vaultId: VaultId; actor: VaultPrincipal; token: string }) {
    this._assertOwnerPrincipal(request.actor);
    await this._deps.sessionTokens.revoke(request.token);
    await this._appendAudit(toAuditEntry(this._deps, request.actor, AuditAction.REVOKE_SESSION_TOKEN, AuditOutcome.SUCCEEDED, "session token revoked"));
  }

  // ─── Custom Flows ─────────────────────────────────────────────────────────────

  async ownerRegisterCustomFlow(command: { vaultId: VaultId; requestId: string; owner: VaultPrincipal; flow: any; requestedAt: string }) {
    this._assertOwnerPrincipal(command.owner);
    const flow: CustomHttpFlowDefinition = { ...command.flow, vaultId: this._deps.vaultId, ownerId: command.owner.id, createdAt: command.requestedAt };
    await this._deps.customFlows.register(flow);
    await this._appendAudit(toAuditEntry(this._deps, command.owner, AuditAction.REGISTER_HTTP_FLOW, AuditOutcome.SUCCEEDED, `http flow registered: "${flow.flowId}" (-> ${flow.targetUrl})`, { detail: flow.flowId }));
  }

  async _storeCustomFlowSecret(flow: CustomHttpFlowDefinition, alias: string, plaintext: string) {
    const source = { kind: "request" as const, requestId: `flow:${flow.flowId}:${Date.now()}` };
    await this.ownerWriteSecret({ vaultId: flow.vaultId, alias, plaintext, source, issuerSiteId: flow.ownerId, requestedAt: this._deps.clock.nowIso() });
  }

  // ─── Event Observers ──────────────────────────────────────────────────────────

  private readonly _requestObservers: ((record: RequestRecord) => void)[] = [];

  ownerOnPendingDispatch(callback: (record: RequestRecord) => void): () => void {
    this._requestObservers.push(callback);
    return () => {
      const idx = this._requestObservers.indexOf(callback);
      if (idx >= 0) this._requestObservers.splice(idx, 1);
    };
  }

  ownerOnGrantState(callback: (record: any) => void): () => void {
    return this.ownerOnPendingDispatch(callback);
  }

  // ─── Internal Helpers ──────────────────────────────────────────────────────────

  private async _recordRequestInternal(
    request: DispatchRequest,
    result: DispatchResult,
    missingGrants?: { agentSecret?: boolean; secretDestination?: boolean },
  ) {
    const record: RequestRecord = {
      vaultId: this._deps.vaultId,
      requestId: request.requestId,
      rootAgentId: request.agent.id,
      reason: request.reason,
      createdAt: this._deps.clock.nowIso(),
      request: {
        targetUrl: request.targetUrl,
        method: request.method,
        headers: request.headers,
        body: request.body,
        secretAlias: request.secretAlias,
      },
      response: {
        status: result.responseStatus,
        body: result.responseBody,
        error: result.error,
      },
      execution: { status: result.status },
      missingGrants,
    };
    await this._deps.requests.save(record);
    if (result.status === DispatchStatus.PENDING) {
      this._requestObservers.forEach(obs => obs(record));
    }
  }

  private toAgentVisibleRequestRecord(record: RequestRecord): AgentVisibleRequestRecord {
    return {
      requestId: record.requestId,
      createdAt: record.createdAt,
      reason: record.reason,
      targetUrl: record.request.targetUrl,
      executionStatus: record.execution.status,
      responseStatus: record.response?.status,
      error: record.response?.error,
      hasResponseBody: !!record.response?.body,
    };
  }

  private toOwnerVisibleRequestRecord(record: RequestRecord): OwnerVisibleRequestRecord {
    return {
      requestId: record.requestId,
      createdAt: record.createdAt,
      rootAgentId: record.rootAgentId,
      reason: record.reason,
      targetUrl: record.request.targetUrl,
      executionStatus: record.execution.status,
      responseStatus: record.response?.status,
      error: record.response?.error,
      hasResponseBody: !!record.response?.body,
      missingGrants: record.missingGrants,
    };
  }

  private toOwnerRequestRecord(record: RequestRecord): OwnerRequestRecord {
    return {
      requestId: record.requestId,
      createdAt: record.createdAt,
      rootAgentId: record.rootAgentId,
      reason: record.reason,
      request: {
        targetUrl: record.request.targetUrl,
        method: record.request.method,
        headers: record.request.headers,
        body: record.request.body,
        secretAlias: record.request.secretAlias,
      },
      response: record.response,
      executionStatus: record.execution.status,
      missingGrants: record.missingGrants,
    };
  }
}

export function createVaultCore(deps: VaultCoreDependencies): VaultCore {
  return new VaultCore({
    ...deps,
    requests: deps.requests ?? new InMemoryRequestRecordRegistry(),
  });
}
