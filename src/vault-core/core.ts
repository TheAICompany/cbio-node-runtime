import {
  AuditOperation,
  DispatchStatus,
  type AgentIdentityRecord,
  type AgentRuntimeManifest,
  type AgentVisibleRequestRecord,
  type AgentRequestRecord,
  type AgentVisibleSecretRecord,
  type AuditEntry,
  type AuditQuery,

  type DispatchAuthorization,
  type DispatchDecision,
  type DispatchInstruction,
  type DispatchRequest,
  type DispatchResult,
  type OwnerPendingDispatchSubscription,
  type OwnerAuditSubscription,
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
  operation: AuditOperation,
  decision: "allowed" | "denied",
  execution_status: "not_executed" | "succeeded" | "failed",
  detail: string,
  extra: Partial<AuditEntry> = {},
): AuditEntry {
  return {
    event_id: deps.ids.newAuditEntryId(),
    ts: deps.clock.nowIso(),
    vault_id: deps.vault_id.value,
    actor,
    operation,
    decision,
    execution_status,
    detail,
    ...extra,
  };
}

export class VaultCore {
  private readonly _deps: VaultCoreDependencies;

  constructor(deps: VaultCoreDependencies) {
    this._deps = deps;
  }

  get vault_id() {
    return this._deps.vault_id;
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
    command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; request_id: string; requested_at: string },
    actionName: string,
    extraAudit: Record<string, any> = {},
  ) {
    try {
      await this._deps.agentProofVerifier.verify(command as any);
      await this._deps.replayGuard.assertNotReplayed(command as any);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this._appendAudit(
        toAuditEntry(this._deps, command.agent, AuditOperation.POLICY_EVALUATE, "denied", "not_executed", `proof verification failed: ${detail}`, {
          request_id: command.request_id,
          root_agent_id: command.agent.id,
          secret_alias: (command as any).secret_alias,
          ...extraAudit,
        }),
      );
      throw error;
    }
  }

  // ─── Grant Management ─────────────────────────────────────────────────────────

  async ownerGrantAgentSecret(
    actor: VaultPrincipal & { kind: "owner" },
    root_agent_id: string,
    secret_alias: string,
    request?: { request_id?: string },
  ): Promise<AgentSecretGrant> {
    this._assertOwnerPrincipal(actor);
    const now = this._deps.clock.nowIso();
    const grant: AgentSecretGrant = {
      vault_id: this._deps.vault_id,
      root_agent_id,
      secret_alias,
      status: "approved",
      requested_at: now,
      granted_at: now,
    };
    await this._deps.agent_secretGrants.upsert(grant);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditOperation.GRANT_SECRET, "allowed", "succeeded", `granted secret "${secret_alias}" to agent "${root_agent_id}"`, {
        request_id: request?.request_id,
        root_agent_id,
        secret_alias: secret_alias,
      }),
    );
    return grant;
  }

  async ownerGrantSecretDestination(
    actor: VaultPrincipal & { kind: "owner" },
    secret_alias: string,
    site_id: string,
    request?: { request_id?: string },
  ): Promise<SecretDestinationGrant> {
    this._assertOwnerPrincipal(actor);
    const now = this._deps.clock.nowIso();
    const grant: SecretDestinationGrant = {
      vault_id: this._deps.vault_id,
      secret_alias,
      site_id,
      status: "approved",
      requested_at: now,
      granted_at: now,
    };
    await this._deps.secret_destinationGrants.upsert(grant);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditOperation.GRANT_DESTINATION, "allowed", "succeeded", `granted destination "${site_id}" for secret "${secret_alias}"`, {
        request_id: request?.request_id,
        secret_alias: secret_alias,
        site_id,
      }),
    );
    return grant;
  }

  async ownerRevokeAgentSecret(
    actor: VaultPrincipal & { kind: "owner" },
    root_agent_id: string,
    secret_alias: string,
    request?: { request_id?: string },
  ): Promise<void> {
    this._assertOwnerPrincipal(actor);
    await this._deps.agent_secretGrants.delete(this._deps.vault_id, root_agent_id, secret_alias);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditOperation.REVOKE_SECRET, "allowed", "succeeded", `revoked secret "${secret_alias}" from agent "${root_agent_id}"`, {
        request_id: request?.request_id,
        root_agent_id,
        secret_alias: secret_alias,
      }),
    );
  }

  async ownerRevokeSecretDestination(
    actor: VaultPrincipal & { kind: "owner" },
    secret_alias: string,
    site_id: string,
    request?: { request_id?: string },
  ): Promise<void> {
    this._assertOwnerPrincipal(actor);
    await this._deps.secret_destinationGrants.delete(this._deps.vault_id, secret_alias, site_id);
    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditOperation.REVOKE_DESTINATION, "allowed", "succeeded", `revoked destination "${site_id}" from secret "${secret_alias}"`, {
        request_id: request?.request_id,
        secret_alias: secret_alias,
        site_id,
      }),
    );
  }

  async ownerListGrants(
    actor: VaultPrincipal & { kind: "owner" },
    root_agent_id?: string,
    secret_alias?: string,
  ) {
    this._assertOwnerPrincipal(actor);
    const [agent_secrets, secret_destinations] = await Promise.all([
      this._deps.agent_secretGrants.list(this._deps.vault_id, root_agent_id),
      this._deps.secret_destinationGrants.list(this._deps.vault_id, secret_alias),
    ]);
    return { agent_secrets, secret_destinations };
  }

  // ─── Dispatch Authorization ───────────────────────────────────────────────────

  async agentAuthorizeDispatch(request: DispatchRequest): Promise<DispatchAuthorization> {
    const { agent, secret_alias, target_url } = request;

    if (!secret_alias) {
      return { vault_id: this._deps.vault_id, decision: "deny", reason: "secret_alias required", secret_id: null };
    }

    const secret = await this._deps.secrets.getByAlias({ value: secret_alias });
    if (!secret) {
      return { vault_id: this._deps.vault_id, decision: "deny", reason: `secret not found: ${secret_alias}`, secret_id: null };
    }

    // 1. Check Agent-Secret Grant
    const agent_secretGrant = await this._deps.agent_secretGrants.get(this._deps.vault_id, agent.id, secret_alias);
    const agent_secretApproved = agent_secretGrant?.status === "approved";

    // 2. Check Secret-Destination Grant
    const site_id = extractDomain(target_url);
    const destGrant = await this._deps.secret_destinationGrants.get(this._deps.vault_id, secret_alias, site_id);
    const destApproved = destGrant?.status === "approved";

    if (agent_secretApproved && destApproved) {
      return { vault_id: this._deps.vault_id, decision: "allow", reason: "granted", secret_id: secret.secret_id };
    }

    const missing_grants = {
      agent_secret: !agent_secretApproved,
      secret_destination: !destApproved,
    };

    return {
      vault_id: this._deps.vault_id,
      decision: "pending",
      reason: "pending approval",
      secret_id: secret.secret_id,
      missing_grants,
    };
  }

  async agentDispatchSecret(request: DispatchRequest): Promise<DispatchResult> {
    await this._verifyAgentControlProof(request, "dispatch");
    await this._createInitialRequestRecord(request);

    const authorization = await this.agentAuthorizeDispatch(request);

    if (authorization.decision === "deny") {
      const result: DispatchResult = {
        vault_id: this._deps.vault_id,
        request_id: request.request_id,
        status: DispatchStatus.DENIED,
        target_url: request.target_url,
        method: request.method,
        error: authorization.reason ?? "denied",
      };
      await this._appendAudit(
        toAuditEntry(this._deps, request.agent, AuditOperation.POLICY_EVALUATE, "denied", "not_executed", authorization.reason ?? "denied", {
          request_id: request.request_id,
          root_agent_id: request.agent.id,
          target: { kind: "http", url: request.target_url },
          secret_alias: request.secret_alias,
        }),
      );
      await this._updateRequestRecordInternal(request, result);
      return result;
    }

    if (authorization.decision === "pending") {
      const result: DispatchResult = {
        vault_id: this._deps.vault_id,
        request_id: request.request_id,
        status: DispatchStatus.AWAITING_APPROVAL,
        target_url: request.target_url,
        method: request.method,
      };
      await this._updateRequestRecordInternal(request, result, authorization.missing_grants);
      await this._appendAudit(
        toAuditEntry(this._deps, request.agent, AuditOperation.DISPATCH_HOLD, "allowed", "not_executed", "request held for human approval", {
          request_id: request.request_id,
          root_agent_id: request.agent.id,
          target: { kind: "http", url: request.target_url },
          secret_alias: request.secret_alias,
        }),
      );
      return result;
    }

    // Proceed with dispatch
    const secret_id = authorization.secret_id!;
    const secretRecord = await this._deps.secrets.getById(secret_id);
    if (!secretRecord) {
      throw new VaultCoreError("secret record not found after authorization", "VAULT_INTERNAL_ERROR");
    }

    const plaintext = await this._deps.custody.load(secret_id);
    if (plaintext === null) {
      throw new VaultCoreError("secret material not found", "VAULT_SECRET_NOT_FOUND");
    }

    const result = await this._deps.executor.dispatch(
      {
        vault_id: this._deps.vault_id,
        request_id: request.request_id,
        secret_id: secret_id,
        target_url: request.target_url,
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
        AuditOperation.SECRET_DISPATCH,
        "allowed",
        result.status === DispatchStatus.SUCCEEDED ? "succeeded" : "failed",
        result.status === DispatchStatus.SUCCEEDED ? "dispatch completed" : (result.error ?? "dispatch failed"),
        {
          request_id: request.request_id,
          root_agent_id: request.agent.id,
          target: { kind: "http", url: request.target_url },
          secret_alias: request.secret_alias,
          secret_id: secret_id.value,
        },
      ),
    );

    await this._updateRequestRecordInternal(request, result);

    return {
      ...result,
      vault_id: this._deps.vault_id,
      response_body: undefined, // Hide body in direct return
    };
  }

  // ─── Pending Approval ─────────────────────────────────────────────────────────

  async ownerApproveDispatch(
    actor: VaultPrincipal & { kind: "owner" },
    request_id: string,
    decision: DispatchApprovalDecision,
  ): Promise<DispatchResult | null> {
    this._assertOwnerPrincipal(actor);
    const record = await this._deps.requests.get(this._deps.vault_id, request_id);
    if (!record) {
      throw new VaultCoreError("request record not found", "VAULT_REQUEST_NOT_FOUND");
    }

    if (record.execution.status !== DispatchStatus.AWAITING_APPROVAL) {
      throw new VaultCoreError("request is not pending", "VAULT_REQUEST_NOT_PENDING");
    }

    if (decision === "deny") {
      const updated: RequestRecord = {
        ...record,
        execution: { status: DispatchStatus.DENIED },
      };
      await this._deps.requests.save(updated);
      await this._appendAudit(
        toAuditEntry(this._deps, actor, AuditOperation.DISPATCH_REJECT, "allowed", "succeeded", "dispatch rejected by owner", {
          request_id,
          root_agent_id: record.root_agent_id,
        }),
      );
      return null;
    }

    const secret_alias = record.request.secret_alias;
    if (!secret_alias) {
      throw new VaultCoreError("record missing secret_alias", "VAULT_INTERNAL_ERROR");
    }

    const secret = await this._deps.secrets.getByAlias({ value: secret_alias });
    if (!secret) {
      throw new VaultCoreError("secret not found during approval", "VAULT_SECRET_NOT_FOUND");
    }

    // Auto-grant if requested
    if (decision === "allow_and_grant") {
      const now = this._deps.clock.nowIso();
      const site_id = extractDomain(record.request.target_url);

      await Promise.all([
        this._deps.agent_secretGrants.upsert({
          vault_id: this._deps.vault_id,
          root_agent_id: record.root_agent_id,
          secret_alias,
          status: "approved",
          requested_at: now,
          granted_at: now,
        }),
        this._deps.secret_destinationGrants.upsert({
          vault_id: this._deps.vault_id,
          secret_alias,
          site_id,
          status: "approved",
          requested_at: now,
          granted_at: now,
        }),
      ]);
      await this._appendAudit(
        toAuditEntry(this._deps, actor, AuditOperation.GRANT_SECRET, "allowed", "succeeded", "granted during dispatch approval", {
          request_id,
          root_agent_id: record.root_agent_id,
          secret_alias: secret_alias,
        }),
      );
      await this._appendAudit(
        toAuditEntry(this._deps, actor, AuditOperation.GRANT_DESTINATION, "allowed", "succeeded", "granted during dispatch approval", {
          request_id,
          secret_alias: secret_alias,
          site_id,
        }),
      );
    }

    // Execute
    const plaintext = await this._deps.custody.load(secret.secret_id);
    if (plaintext === null) {
      throw new VaultCoreError("secret material not found", "VAULT_SECRET_NOT_FOUND");
    }

    const result = await this._deps.executor.dispatch(
      {
        vault_id: this._deps.vault_id,
        request_id,
        secret_id: secret.secret_id,
        target_url: record.request.target_url,
        method: record.request.method,
        headers: record.request.headers,
        body: record.request.body,
      },
      { record: secret, plaintext },
    );

    const finalRecord: RequestRecord = {
      ...record,
      response: {
        status: result.response_status,
        headers: result.response_headers,
        body: result.response_body,
        error: result.error,
      },
      execution: { status: result.status },
    };
    await this._deps.requests.save(finalRecord);

    await this._appendAudit(
      toAuditEntry(this._deps, actor, AuditOperation.DISPATCH_APPROVE, "allowed", "succeeded", `dispatch approved (${decision})`, {
        request_id,
        root_agent_id: record.root_agent_id,
      }),
    );

    await this._appendAudit(
      toAuditEntry(
        this._deps,
        { kind: "agent", id: record.root_agent_id },
        AuditOperation.SECRET_DISPATCH,
        "allowed",
        result.status === DispatchStatus.SUCCEEDED ? "succeeded" : "failed",
        result.status === DispatchStatus.SUCCEEDED ? "dispatch completed" : (result.error ?? "dispatch failed"),
        {
          request_id,
          root_agent_id: record.root_agent_id,
          target: { kind: "http", url: record.request.target_url },
          secret_alias,
          secret_id: secret.secret_id.value,
        },
      ),
    );

    return result;
  }

  // ─── Agent Control APIs ───────────────────────────────────────────────────────

  async agentGetRuntimeManifest(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; request_id: string; requested_at: string }): Promise<AgentRuntimeManifest> {
    await this._verifyAgentControlProof(command, "get_manifest");

    const agentRecord = await this._deps.agentRecords.get(this._deps.vault_id, command.agent.id);
    if (!agentRecord) {
      throw new VaultCoreError("agent.identity not registered", "VAULT_DISPATCH_DENIED");
    }

    const [agent_secrets, secret_destinations] = await Promise.all([
      this._deps.agent_secretGrants.list(this._deps.vault_id, command.agent.id),
      this._deps.secret_destinationGrants.list(this._deps.vault_id), // All destination grants for these secrets? Or just a subset? 
      // For simplicity, return all destinations that mention a secret the agent has a grant for.
    ]);

    const secret_aliases = new Set(agent_secrets.map(g => g.secret_alias));
    const relevantDestinations = secret_destinations.filter(d => secret_aliases.has(d.secret_alias));

    return {
      root_agent_id: command.agent.id,
      vault_id: this._deps.vault_id.value,
      issued_at: this._deps.clock.nowIso(),
      agent: {
        root_agent_id: agentRecord.root_agent_id,
                public_key: agentRecord.public_key,
        nickname: agentRecord.nickname,
        metadata: agentRecord.metadata,
      },
      grants: {
        agent_secrets: agent_secrets.filter(g => g.status === "approved"),
        secret_destinations: relevantDestinations.filter(d => d.status === "approved"),
      },
      tools: getAgentToolbox(),
    };
  }

  async agentListSecrets(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; request_id: string; requested_at: string }): Promise<readonly AgentVisibleSecretRecord[]> {
    await this._verifyAgentControlProof(command, "list_secrets");
    const records = await this._deps.secrets.list(this._deps.vault_id);
    const grants = await this._deps.agent_secretGrants.list(this._deps.vault_id, command.agent.id);
    const approvedAliases = new Set(grants.filter(g => g.status === "approved").map(g => g.secret_alias));

    return records.map(record => ({
      vault_id: record.vault_id,
      secret_id: record.secret_id,
      alias: record.alias,
      version: record.version,
      lifecycle_status: record.lifecycle_status ?? "ACTIVE",
      issuer_id: record.issuer_id,
      source: record.source,
      created_at: record.created_at,
      updated_at: record.updated_at,
      granted: approvedAliases.has(record.alias.value),
    }));
  }

  async agentListRequests(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; request_id: string; requested_at: string }): Promise<readonly AgentVisibleRequestRecord[]> {
    await this._verifyAgentControlProof(command, "list_requests");
    const records = await this._deps.requests.list(this._deps.vault_id, command.agent.id);
    return records.map(r => this.toAgentVisibleRequestRecord(r));
  }

  async agentGetRequest(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; request_id: string; requested_at: string; target_request_id: string }): Promise<AgentRequestRecord> {
    await this._verifyAgentControlProof(command, "read_request");
    const record = await this._deps.requests.get(this._deps.vault_id, command.target_request_id);
    if (!record || record.root_agent_id !== command.agent.id) {
      throw new VaultCoreError("request record not found", "VAULT_READ_DENIED");
    }

    return {
      request_id: record.request_id,
      created_at: record.created_at,
      requested_at: record.requested_at,
      reason: record.reason,
      request: {
        target_url: record.request.target_url,
        method: record.request.method,
        headers: record.request.headers,
        body: record.request.body,
        secret_alias: record.request.secret_alias,
      },
      response: record.response,
      execution_status: record.execution.status,
    };
  }

  // ─── Owner Management APIs ────────────────────────────────────────────────────

  async ownerRegisterAgentIdentity(command: { vault_id: VaultId; request_id: string; owner: VaultPrincipal; agentRecord: AgentIdentityRecord; requested_at: string }) {
    this._assertOwnerPrincipal(command.owner);
    await this._deps.agentRecords.register(command.agentRecord);
    await this._appendAudit(toAuditEntry(this._deps, command.owner, AuditOperation.IDENTITY_REGISTER, "allowed", "succeeded", `agent identity registered: "${command.agentRecord.root_agent_id}"`, { root_agent_id: command.agentRecord.root_agent_id }));
  }

  async ownerUpdateAgentIdentity(command: { vault_id: VaultId; request_id: string; owner: VaultPrincipal; root_agent_id: string; nickname?: string; metadata?: Record<string, any>; requested_at: string }): Promise<AgentIdentityRecord> {
    this._assertOwnerPrincipal(command.owner);
    const existing = await this._deps.agentRecords.get(command.vault_id, command.root_agent_id);
    if (!existing) throw new VaultCoreError("agent identity not found", "VAULT_IDENTITY_NOT_FOUND");
    const updated = { ...existing, nickname: command.nickname ?? existing.nickname, metadata: command.metadata ?? existing.metadata };
    await this._deps.agentRecords.register(updated);
    await this._appendAudit(toAuditEntry(this._deps, command.owner, AuditOperation.IDENTITY_UPDATE, "allowed", "succeeded", `agent identity updated: "${command.root_agent_id}"`, { root_agent_id: command.root_agent_id }));
    return updated;
  }

  async ownerCreateSecret(command: OwnerCreateSecretCommand): Promise<SecretRecord> {
    this._assertOwnerPrincipal(command.owner);
    await this._deps.policy.authorizeWrite(command);
    const existing = await this._deps.secrets.getByAlias({ value: command.alias });
    if (existing) {
      throw new VaultCoreError(`secret alias already exists: "${command.alias}"`, "VAULT_ALIAS_ALREADY_EXISTS");
    }
    const secret_id = this._deps.ids.newSecretId();
    const now = this._deps.clock.nowIso();
    const record: SecretRecord = {
      vault_id: command.vault_id,
      secret_id,
      alias: { value: command.alias },
      version: this._deps.ids.newVersion(),
      lifecycle_status: "ACTIVE",
      issuer_id: null,
      source: command.source ? (command.source.kind === "request" ? { kind: "request", request_id: command.source.request_id! } : { kind: "manual" }) : { kind: "manual" },
      created_at: now,
      updated_at: now,
    };
    await this._deps.secrets.save(record);
    await this._deps.custody.store(secret_id, command.plaintext);
    await this._appendAudit(toAuditEntry(this._deps, command.owner, AuditOperation.SECRET_WRITE, "allowed", "succeeded", `secret created: "${command.alias}"`, { secret_alias: command.alias, secret_id: secret_id.value }));
    return record;
  }

  async ownerUpdateSecret(command: OwnerUpdateSecretCommand): Promise<SecretRecord> {
    this._assertOwnerPrincipal(command.owner);
    await this._deps.policy.authorizeWrite(command);
    const existing = await this._deps.secrets.getByAlias({ value: command.alias });
    if (!existing) throw new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");

    if (command.new_alias && command.new_alias !== command.alias) {
      const duplicate = await this._deps.secrets.getByAlias({ value: command.new_alias });
      if (duplicate) {
        throw new VaultCoreError(`secret alias already exists: "${command.new_alias}"`, "VAULT_ALIAS_ALREADY_EXISTS");
      }
    }

    const secret_id = existing.secret_id;
    const now = this._deps.clock.nowIso();
    const finalAlias = command.new_alias && command.new_alias !== command.alias ? command.new_alias : command.alias;

    const record: SecretRecord = {
      ...existing,
      alias: { value: finalAlias },
      version: this._deps.ids.newVersion(),
      updated_at: now,
    };
    await this._deps.secrets.save(record);
    if (command.plaintext !== undefined) {
      await this._deps.custody.store(secret_id, command.plaintext);
    }
    await this._appendAudit(toAuditEntry(this._deps, command.owner, AuditOperation.SECRET_WRITE, "allowed", "succeeded", `secret updated: "${finalAlias}"`, { secret_alias: finalAlias, secret_id: secret_id.value }));
    return record;
  }

  async ownerRemoveSecret(command: { kind: "owner.remove_secret"; vault_id: VaultId; request_id: string; owner: VaultPrincipal; alias: string; requested_at: string }) {
    this._assertOwnerPrincipal(command.owner);
    const record = await this._deps.secrets.getByAlias({ value: command.alias });
    if (!record) throw new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");
    await this._deps.secrets.delete(record.secret_id);
    await this._deps.custody.delete(record.secret_id);
    await this._appendAudit(toAuditEntry(this._deps, command.owner, AuditOperation.SECRET_DELETE, "allowed", "succeeded", `secret deleted: "${command.alias}"`, { secret_alias: command.alias, secret_id: record.secret_id.value }));
  }

  async ownerReadAudit(actor: VaultPrincipal & { kind: "owner" }, query: AuditQuery): Promise<readonly AuditEntry[]> {
    this._assertOwnerPrincipal(actor);
    return this._deps.audit.query(query);
  }

  async ownerExportSecret(actor: VaultPrincipal & { kind: "owner" }, alias: string): Promise<OwnerSecretExport> {
    this._assertOwnerPrincipal(actor);
    const record = await this._deps.secrets.getByAlias({ value: alias });
    if (!record) throw new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");
    const plaintext = await this._deps.custody.load(record.secret_id);
    if (plaintext === null) throw new VaultCoreError("secret material not found", "VAULT_SECRET_NOT_FOUND");
    await this._appendAudit(toAuditEntry(this._deps, actor, AuditOperation.SECRET_EXPORT, "allowed", "succeeded", `secret exported as plaintext: "${alias}"`, { secret_alias: alias, secret_id: record.secret_id.value }));
    return { vault_id: this._deps.vault_id, secret_id: record.secret_id, alias: record.alias, plaintext, exported_at: this._deps.clock.nowIso() };
  }

  async ownerListAgents(actor: VaultPrincipal & { kind: "owner" }): Promise<readonly AgentIdentityRecord[]> {
    this._assertOwnerPrincipal(actor);
    const identities = await this._deps.agentRecords.list(this._deps.vault_id);
    const sessionTokens = await this._deps.sessionTokenRegistry.list();
    const tokensByAgentId = new Map<string, StoredSessionToken>();
    for (const st of sessionTokens) {
      tokensByAgentId.set(st.root_agent_id, st);
    }
    return identities.map(id => ({ ...id, session_token: tokensByAgentId.get(id.root_agent_id) }));
  }

  async ownerListRequests(actor: VaultPrincipal & { kind: "owner" }, root_agent_id?: string): Promise<readonly OwnerVisibleRequestRecord[]> {
    this._assertOwnerPrincipal(actor);
    const records = await this._deps.requests.list(this._deps.vault_id, root_agent_id);
    return records.map(r => this.toOwnerVisibleRequestRecord(r));
  }

  async ownerGetRequest(actor: VaultPrincipal & { kind: "owner" }, request_id: string): Promise<OwnerRequestRecord> {
    this._assertOwnerPrincipal(actor);
    const record = await this._deps.requests.get(this._deps.vault_id, request_id);
    if (!record) throw new VaultCoreError("request record not found", "VAULT_REQUEST_NOT_FOUND");
    return this.toOwnerRequestRecord(record);
  }

  async ownerListSecrets(actor: VaultPrincipal & { kind: "owner" }): Promise<readonly AgentVisibleSecretRecord[]> {
    this._assertOwnerPrincipal(actor);
    const records = await this._deps.secrets.list(this._deps.vault_id);
    return records.map(r => ({
      vault_id: r.vault_id,
      secret_id: r.secret_id,
      alias: r.alias,
      version: r.version,
      lifecycle_status: r.lifecycle_status ?? "ACTIVE",
      issuer_id: r.issuer_id,
      source: r.source,
      created_at: r.created_at,
      updated_at: r.updated_at,
      granted: true,
    }));
  }

  async ownerIssueSessionToken(request: { vault_id: VaultId; actor: VaultPrincipal; root_agent_id: string }) {
    this._assertOwnerPrincipal(request.actor);
    const token = await this._deps.sessionTokenRegistry.issue(request.root_agent_id);
    await this._appendAudit(toAuditEntry(this._deps, request.actor, AuditOperation.IDENTITY_ISSUE_TOKEN, "allowed", "succeeded", `session token issued for agent: "${request.root_agent_id}"`, { root_agent_id: request.root_agent_id }));
    return { token, root_agent_id: request.root_agent_id, issued_at: this._deps.clock.nowIso() };
  }

  async ownerIssueAllAgentSessionTokens(actor: VaultPrincipal & { kind: "owner" }) {
    this._assertOwnerPrincipal(actor);
    const agents = await this.ownerListAgents(actor);
    return Promise.all(agents.map(a => this.ownerIssueSessionToken({ vault_id: this._deps.vault_id, actor, root_agent_id: a.root_agent_id })));
  }

  async ownerRevokeSessionToken(request: { vault_id: VaultId; actor: VaultPrincipal; token: string }) {
    this._assertOwnerPrincipal(request.actor);
    await this._deps.sessionTokenRegistry.revoke(request.token);
    await this._appendAudit(toAuditEntry(this._deps, request.actor, AuditOperation.IDENTITY_REVOKE_TOKEN, "allowed", "succeeded", "session token revoked"));
  }
  ownerOnPendingDispatch(subscription: OwnerPendingDispatchSubscription): () => void {
    return this._deps.audit.subscribe(this._deps.vault_id, {
      operations: [AuditOperation.DISPATCH_HOLD],
      onEvent: async (entry) => {
        if (!entry.request_id) return;
        const record = await this._deps.requests.get(this._deps.vault_id, entry.request_id);
        if (!record || record.execution.status !== DispatchStatus.AWAITING_APPROVAL) return;
        const pendingEventId = record.pending_dispatch_event?.event_id ?? entry.event_id;
        if (subscription.afterEventId && pendingEventId <= subscription.afterEventId) return;
        subscription.onEvent({
          event_id: pendingEventId,
          emitted_at: record.pending_dispatch_event?.emitted_at ?? entry.ts,
          record,
        });
      },
    });
  }
  ownerOnAudit(subscription: OwnerAuditSubscription): () => void {
    return this._deps.audit.subscribe(this._deps.vault_id, subscription);
  }

  // ─── Internal Helpers ──────────────────────────────────────────────────────────

  private async _recordRequestInternal(
    request: DispatchRequest,
    status: DispatchStatus,
  ) {
    const record: RequestRecord = {
      vault_id: this._deps.vault_id,
      request_id: request.request_id,
      root_agent_id: request.agent.id,
      reason: request.reason,
      created_at: this._deps.clock.nowIso(),
      requested_at: request.requested_at,
      request: {
        target_url: request.target_url,
        method: request.method,
        headers: request.headers,
        body: request.body,
        secret_alias: request.secret_alias,
      },
      execution: { status },
    };
    await this._deps.requests.save(record);
  }

  private async _createInitialRequestRecord(request: DispatchRequest) {
    await this._recordRequestInternal(request, DispatchStatus.IN_PROGRESS);
  }

  private async _updateRequestRecordInternal(
    request: DispatchRequest,
    result: DispatchResult,
    missing_grants?: { agent_secret?: boolean; secret_destination?: boolean },
  ) {
    const existing = await this._deps.requests.get(this._deps.vault_id, request.request_id);
    const baseRecord = existing ?? {
      vault_id: this._deps.vault_id,
      request_id: request.request_id,
      root_agent_id: request.agent.id,
      reason: request.reason,
      created_at: this._deps.clock.nowIso(),
      requested_at: request.requested_at,
      request: {
        target_url: request.target_url,
        method: request.method,
        headers: request.headers,
        body: request.body,
        secret_alias: request.secret_alias,
      },
      execution: { status: DispatchStatus.IN_PROGRESS },
    };
    const pending_dispatch_event = result.status === DispatchStatus.AWAITING_APPROVAL
      ? (existing?.pending_dispatch_event ?? (() => {
        const emitted_at = this._deps.clock.nowIso();
        return {
          event_id: `${emitted_at}::${request.request_id}`,
          emitted_at,
        };
      })())
      : existing?.pending_dispatch_event;
    const record: RequestRecord = {
      ...baseRecord,
      response: {
        status: result.response_status,
        headers: result.response_headers,
        body: result.response_body,
        error: result.error,
      },
      execution: { status: result.status },
      missing_grants,
      pending_dispatch_event,
    };
    await this._deps.requests.save(record);
  }

  private toAgentVisibleRequestRecord(record: RequestRecord): AgentVisibleRequestRecord {
    return {
      request_id: record.request_id,
      created_at: record.created_at,
      reason: record.reason,
      target_url: record.request.target_url,
      execution_status: record.execution.status,
      response_status: record.response?.status,
      error: record.response?.error,
      has_response_body: !!record.response?.body,
    };
  }

  private toOwnerVisibleRequestRecord(record: RequestRecord): OwnerVisibleRequestRecord {
    return {
      request_id: record.request_id,
      created_at: record.created_at,
      root_agent_id: record.root_agent_id,
      reason: record.reason,
      target_url: record.request.target_url,
      execution_status: record.execution.status,
      response_status: record.response?.status,
      error: record.response?.error,
      has_response_body: !!record.response?.body,
      missing_grants: record.missing_grants,
    };
  }

  private toOwnerRequestRecord(record: RequestRecord): OwnerRequestRecord {
    return {
      request_id: record.request_id,
      created_at: record.created_at,
      requested_at: record.requested_at,
      root_agent_id: record.root_agent_id,
      reason: record.reason,
      request: {
        target_url: record.request.target_url,
        method: record.request.method,
        headers: record.request.headers,
        body: record.request.body,
        secret_alias: record.request.secret_alias,
      },
      response: record.response,
      execution_status: record.execution.status,
      missing_grants: record.missing_grants,
    };
  }
}

export function createVaultCore(deps: VaultCoreDependencies): VaultCore {
  return new VaultCore({
    ...deps,
    requests: deps.requests ?? new InMemoryRequestRecordRegistry(),
  });
}
