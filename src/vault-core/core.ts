import {
  DispatchStatus,
  type AgentIdentityRecord,
  type AgentRuntimeManifest,
  type AgentRequestRecord,
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
  type SiteRecord,
} from "./contracts.js";
import { type VaultCoreErrorCode, VaultCoreError } from "./errors.js";
import type { VaultCoreDependencies } from "./ports.js";
import { getAgentToolbox } from "./tool-metadata.js";

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
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this._appendAuditEntry(
        command.agent,
        actionName,
        { ...command, ...extraAudit },
        undefined,
        errorMsg
      );
      throw error;
    }
  }

  // ─── Grant Management ─────────────────────────────────────────────────────────

  async ownerGrantAgentSecret(
    actor: VaultPrincipal & { kind: "owner" },
    root_agent_id: string,
    secret_id: SecretId,
    request?: { request_id?: string },
  ): Promise<AgentSecretGrant> {
    this._assertOwnerPrincipal(actor);
    const now = this._deps.clock.nowIso();
    const grant: AgentSecretGrant = {
      vault_id: this._deps.vault_id,
      root_agent_id,
      secret_id,
      status: "approved",
      requested_at: now,
      granted_at: now,
    };
    await this._deps.agent_secretGrants.upsert(grant);
    await this._appendAuditEntry(
      actor,
      "ownerGrantAgentSecret",
      { root_agent_id, secret_id, request_id: request?.request_id },
      grant
    );
    return grant;
  }

  async ownerGrantSecretDestination(
    actor: VaultPrincipal & { kind: "owner" },
    secret_id: SecretId,
    site_id: string,
    request?: { request_id?: string },
  ): Promise<SecretDestinationGrant> {
    this._assertOwnerPrincipal(actor);
    const now = this._deps.clock.nowIso();
    const grant: SecretDestinationGrant = {
      vault_id: this._deps.vault_id,
      secret_id,
      site_id,
      status: "approved",
      requested_at: now,
      granted_at: now,
    };
    await this._deps.secret_destinationGrants.upsert(grant);
    await this._appendAuditEntry(
      actor,
      "ownerGrantSecretDestination",
      { secret_id, site_id, request_id: request?.request_id },
      grant
    );
    return grant;
  }

  async ownerRevokeAgentSecret(
    actor: VaultPrincipal & { kind: "owner" },
    root_agent_id: string,
    secret_id: SecretId,
    request?: { request_id?: string },
  ): Promise<void> {
    this._assertOwnerPrincipal(actor);
    await this._deps.agent_secretGrants.delete(this._deps.vault_id, root_agent_id, secret_id);
    await this._appendAuditEntry(
      actor,
      "ownerRevokeAgentSecret",
      { root_agent_id, secret_id, request_id: request?.request_id },
      undefined
    );
  }

  async ownerRevokeSecretDestination(
    actor: VaultPrincipal & { kind: "owner" },
    secret_id: SecretId,
    site_id: string,
    request?: { request_id?: string },
  ): Promise<void> {
    this._assertOwnerPrincipal(actor);
    await this._deps.secret_destinationGrants.delete(this._deps.vault_id, secret_id, site_id);
    await this._appendAuditEntry(
      actor,
      "ownerRevokeSecretDestination",
      { secret_id, site_id, request_id: request?.request_id },
      undefined
    );
  }

  async ownerListGrants(
    actor: VaultPrincipal & { kind: "owner" },
    root_agent_id?: string,
    secret_id?: SecretId,
  ) {
    this._assertOwnerPrincipal(actor);
    const [agent_secrets, secret_destinations] = await Promise.all([
      this._deps.agent_secretGrants.list(this._deps.vault_id, root_agent_id),
      this._deps.secret_destinationGrants.list(this._deps.vault_id, secret_id),
    ]);
    return { agent_secrets, secret_destinations };
  }

  // ─── Site Management ──────────────────────────────────────────────────────────

  async ownerCreateSite(
    actor: VaultPrincipal & { kind: "owner" },
    domain: string,
    request?: { request_id?: string },
  ): Promise<SiteRecord> {
    this._assertOwnerPrincipal(actor);
    const now = this._deps.clock.nowIso();
    const site_id = this._deps.ids.newRequestId("site");
    const site: SiteRecord = {
      vault_id: this._deps.vault_id,
      site_id,
      domain,
      created_at: now,
      updated_at: now,
    };
    await this._deps.sites.upsert(site);
    await this._appendAuditEntry(
      actor,
      "ownerCreateSite",
      { site_id, domain, request_id: request?.request_id },
      site,
    );
    return site;
  }

  async ownerUpdateSite(
    actor: VaultPrincipal & { kind: "owner" },
    site_id: string,
    domain: string,
    request?: { request_id?: string },
  ): Promise<SiteRecord> {
    this._assertOwnerPrincipal(actor);
    const existing = await this._deps.sites.get(this._deps.vault_id, site_id);
    if (!existing) {
      throw new VaultCoreError(`site not found: ${site_id}`, "VAULT_INTERNAL_ERROR");
    }
    const now = this._deps.clock.nowIso();
    const updated: SiteRecord = {
      ...existing,
      domain,
      updated_at: now,
    };
    await this._deps.sites.upsert(updated);
    await this._appendAuditEntry(
      actor,
      "ownerUpdateSite",
      { site_id, domain, request_id: request?.request_id },
      updated,
    );
    return updated;
  }

  async ownerDeleteSite(
    actor: VaultPrincipal & { kind: "owner" },
    site_id: string,
    request?: { request_id?: string },
  ): Promise<void> {
    this._assertOwnerPrincipal(actor);
    const allGrants = await this._deps.secret_destinationGrants.list(this._deps.vault_id);
    await Promise.all(
      allGrants
        .filter((g) => g.site_id === site_id)
        .map((g) =>
          this._deps.secret_destinationGrants.delete(this._deps.vault_id, g.secret_id, site_id),
        ),
    );

    // Orphan cleanup: if a secret now has no destination grants at all,
    // its agent-secret grants can never be authorized anymore.
    const remainingDestinationGrants = await this._deps.secret_destinationGrants.list(this._deps.vault_id);
    const secretIdsWithAnyDestination = new Set(remainingDestinationGrants.map((g) => g.secret_id));
    const remainingAgentSecretGrants = await this._deps.agent_secretGrants.list(this._deps.vault_id);
    await Promise.all(
      remainingAgentSecretGrants
        .filter((g) => !secretIdsWithAnyDestination.has(g.secret_id))
        .map((g) => this._deps.agent_secretGrants.delete(this._deps.vault_id, g.root_agent_id, g.secret_id)),
    );

    await this._deps.sites.delete(this._deps.vault_id, site_id);
    await this._appendAuditEntry(
      actor,
      "ownerDeleteSite",
      { site_id, request_id: request?.request_id },
      undefined,
    );
  }

  async ownerListSites(
    actor: VaultPrincipal & { kind: "owner" },
  ): Promise<readonly SiteRecord[]> {
    this._assertOwnerPrincipal(actor);
    return this._deps.sites.list(this._deps.vault_id);
  }

  // ─── Dispatch Authorization ───────────────────────────────────────────────────

  async agentAuthorizeDispatch(request: DispatchRequest): Promise<DispatchAuthorization> {
    const { agent, secret_id, target_url } = request;

    if (!secret_id) {
      return {
        vault_id: this._deps.vault_id,
        decision: "deny",
        reason: "secret_id required; call agentIntrospect/agentListSecrets first and retry with a granted secret_id",
        secret_id: null,
      };
    }

    const secret = await this._deps.secrets.getById(secret_id);
    if (!secret) {
      return { vault_id: this._deps.vault_id, decision: "deny", reason: `secret not found: ${secret_id}`, secret_id: null };
    }

    // 1. Check Agent-Secret Grant
    const agent_secretGrant = await this._deps.agent_secretGrants.get(this._deps.vault_id, agent.id, secret.secret_id);
    const agent_secretApproved = agent_secretGrant?.status === "approved";

    // 2. Check Secret-Destination Grant via sites registry
    const domain = extractDomain(target_url);
    const site = await this._deps.sites.getByDomain(this._deps.vault_id, domain);
    let destApproved = false;
    if (site) {
      const destGrant = await this._deps.secret_destinationGrants.get(
        this._deps.vault_id,
        secret.secret_id,
        site.site_id,
      );
      destApproved = destGrant?.status === "approved";
    }

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
    
    // Resolve secret early to capture stable ID in logs
    const authorization = await this.agentAuthorizeDispatch(request);
    const secret_id = authorization.secret_id;

    await this._recordRequestInternal(request, DispatchStatus.IN_PROGRESS, secret_id);
    await this._appendAuditEntry(
      request.agent,
      "agentDispatchSecret",
      { request_id: request.request_id, root_agent_id: request.agent.id, target: request.target_url, secret_id },
      {
        vault_id: this._deps.vault_id,
        request_id: request.request_id,
        status: DispatchStatus.IN_PROGRESS,
        target_url: request.target_url,
        method: request.method,
      }
    );

    if (authorization.decision === "deny") {
      const result: DispatchResult = {
        vault_id: this._deps.vault_id,
        request_id: request.request_id,
        status: DispatchStatus.DENIED,
        target_url: request.target_url,
        method: request.method,
        error: authorization.reason ?? "denied",
      };
      await this._appendAuditEntry(
        request.agent,
        "agentDispatchSecret",
        { request_id: request.request_id, root_agent_id: request.agent.id, target: request.target_url, secret_id },
        result
      );
      await this._updateRequestRecordInternal(request, result, secret_id);
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
      await this._updateRequestRecordInternal(request, result, secret_id, authorization.missing_grants);
      await this._appendAuditEntry(
        request.agent,
        "agentDispatchSecret",
        { request_id: request.request_id, root_agent_id: request.agent.id, target: request.target_url, secret_id },
        result
      );
      return result;
    }

    // Proceed with dispatch
    if (!secret_id) {
       throw new VaultCoreError(
        "secret_id required for dispatch; call agentIntrospect/agentListSecrets first and retry with a granted secret_id",
        "VAULT_DISPATCH_DENIED"
      );
    }
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

    await this._appendAuditEntry(
      request.agent,
      "agentDispatchSecret",
      { request_id: request.request_id, root_agent_id: request.agent.id, target: request.target_url, secret_id },
      result
    );

    await this._updateRequestRecordInternal(request, result, secret_id);

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
      await this._appendAuditEntry(
        actor,
        "ownerApproveDispatch",
        { request_id, decision, root_agent_id: record.root_agent_id, secret_id: record.request.secret_id },
        updated
      );
      return null;
    }

    const secret_id = record.request.secret_id;
    if (!secret_id) {
      throw new VaultCoreError("record missing secret_id", "VAULT_INTERNAL_ERROR");
    }

    const secret = await this._deps.secrets.getById(secret_id);
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
          secret_id: secret.secret_id,
          status: "approved",
          requested_at: now,
          granted_at: now,
        }),
        this._deps.secret_destinationGrants.upsert({
          vault_id: this._deps.vault_id,
          secret_id: secret.secret_id,
          site_id,
          status: "approved",
          requested_at: now,
          granted_at: now,
        }),
      ]);
      await this._appendAuditEntry(
        actor,
        "ownerApproveDispatch_grant",
        { request_id, root_agent_id: record.root_agent_id, secret_id: secret.secret_id, site_id },
        { status: "granted", request_id }
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

    await this._appendAuditEntry(
      actor,
      "ownerApproveDispatch",
      { request_id, decision, root_agent_id: record.root_agent_id, secret_id: record.request.secret_id },
      result
    );

    await this._appendAuditEntry(
      { kind: "agent", id: record.root_agent_id },
      "agentDispatchSecret",
      {
        request_id,
        root_agent_id: record.root_agent_id,
        target: { kind: "http", url: record.request.target_url },
        secret_id: secret.secret_id,
      },
      result
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
      this._deps.secret_destinationGrants.list(this._deps.vault_id), 
    ]);

    const secret_ids = new Set(agent_secrets.map(g => g.secret_id));
    const relevantDestinations = secret_destinations.filter(d => secret_ids.has(d.secret_id));

    return {
      root_agent_id: command.agent.id,
      vault_id: this._deps.vault_id,
      issued_at: this._deps.clock.nowIso(),
      product_intro:
        "CBIO Vault is a policy-gated outbound execution runtime. As an agent, you can discover approved secrets, send real requests through vault controls, inspect request history, and ask the owner for additional grants when access is missing.",
      what_you_can_do: [
        "Inspect your identity, approved grants, and tool contract via agentIntrospect.",
        "Send outbound HTTP with a vault secret via agentDispatch (policy and approval aware).",
        "List available secrets and check which ones are currently granted.",
        "List request history and read per-request results when read access is approved.",
        "Submit grant requests to expand secret or destination permissions."
      ],
      operating_rules: [
        "You do not directly create, update, or delete vault secrets.",
        "Always include a concise owner-facing reason when dispatching or requesting grants.",
        "If a request is not currently allowed, expect AWAITING_APPROVAL rather than silent execution.",
        "Sensitive response payload visibility may require explicit read approval."
      ],
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

  async agentListSecrets(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; request_id: string; requested_at: string }): Promise<readonly SecretRecord[]> {
    await this._verifyAgentControlProof(command, "list_secrets");
    const records = await this._deps.secrets.list(this._deps.vault_id);
    const grants = await this._deps.agent_secretGrants.list(this._deps.vault_id, command.agent.id);
    const approvedSecretIds = new Set(grants.filter(g => g.status === "approved").map(g => g.secret_id));

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
      granted: approvedSecretIds.has(record.secret_id),
    }));
  }

  async agentListRequests(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; request_id: string; requested_at: string }): Promise<readonly AgentRequestRecord[]> {
    await this._verifyAgentControlProof(command, "list_requests");
    const records = await this._deps.requests.list(this._deps.vault_id, command.agent.id);
    return records.map(r => this.toAgentRequestRecord(r));
  }

  async agentGetRequest(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; request_id: string; requested_at: string; target_request_id: string }): Promise<AgentRequestRecord> {
    await this._verifyAgentControlProof(command, "read_request");
    const record = await this._deps.requests.get(this._deps.vault_id, command.target_request_id);
    if (!record || record.root_agent_id !== command.agent.id) {
      throw new VaultCoreError("request record not found", "VAULT_READ_DENIED");
    }

    return this.toAgentRequestRecord(record);
  }

  async agentAuditTestPing(command: { agent: VaultPrincipal & { kind: "agent" }; proof: any; request_id: string; requested_at: string; label?: string }): Promise<AuditEntry> {
    await this._verifyAgentControlProof(command, "agentAuditTestPing");
    return this._appendAuditEntry(
      command.agent,
      "agentAuditTestPing",
      {
        request_id: command.request_id,
        root_agent_id: command.agent.id,
        label: command.label ?? null,
      },
      { ok: true }
    );
  }

  // ─── Owner Management APIs ────────────────────────────────────────────────────

  async ownerRegisterAgentIdentity(command: { vault_id: VaultId; request_id: string; owner: VaultPrincipal; agentRecord: AgentIdentityRecord; requested_at: string }) {
    this._assertOwnerPrincipal(command.owner);
    await this._deps.agentRecords.register(command.agentRecord);
    await this._appendAuditEntry(
      command.owner,
      "ownerRegisterAgentIdentity",
      { root_agent_id: command.agentRecord.root_agent_id },
      undefined
    );
  }

  async ownerUpdateAgentIdentity(command: { vault_id: VaultId; request_id: string; owner: VaultPrincipal; root_agent_id: string; nickname?: string; metadata?: Record<string, any>; requested_at: string }): Promise<AgentIdentityRecord> {
    this._assertOwnerPrincipal(command.owner);
    const existing = await this._deps.agentRecords.get(command.vault_id, command.root_agent_id);
    if (!existing) throw new VaultCoreError("agent identity not found", "VAULT_IDENTITY_NOT_FOUND");
    const updated = { ...existing, nickname: command.nickname ?? existing.nickname, metadata: command.metadata ?? existing.metadata };
    await this._deps.agentRecords.register(updated);
    await this._appendAuditEntry(
      command.owner,
      "ownerUpdateAgentIdentity",
      { root_agent_id: command.root_agent_id },
      updated
    );
    return updated;
  }

  async ownerRemoveAgentIdentity(command: { vault_id: VaultId; request_id: string; owner: VaultPrincipal; root_agent_id: string; requested_at: string }): Promise<void> {
    this._assertOwnerPrincipal(command.owner);
    const existing = await this._deps.agentRecords.get(command.vault_id, command.root_agent_id);
    if (!existing) throw new VaultCoreError("agent identity not found", "VAULT_IDENTITY_NOT_FOUND");

    const [tokens, grants] = await Promise.all([
      this._deps.sessionTokenRegistry.list(command.root_agent_id),
      this._deps.agent_secretGrants.list(command.vault_id, command.root_agent_id),
    ]);

    for (const token of tokens) {
      await this._deps.sessionTokenRegistry.revoke(token.token);
    }
    for (const grant of grants) {
      await this._deps.agent_secretGrants.delete(command.vault_id, command.root_agent_id, grant.secret_id);
    }

    // Orphan cleanup: if a secret now has no agent-secret grants at all,
    // its destination grants can never be used by any agent anymore.
    const remainingAgentSecretGrants = await this._deps.agent_secretGrants.list(command.vault_id);
    const secretIdsWithAnyAgentSecret = new Set(remainingAgentSecretGrants.map((g) => g.secret_id));
    const destinationGrants = await this._deps.secret_destinationGrants.list(command.vault_id);
    await Promise.all(
      destinationGrants
        .filter((g) => !secretIdsWithAnyAgentSecret.has(g.secret_id))
        .map((g) => this._deps.secret_destinationGrants.delete(command.vault_id, g.secret_id, g.site_id)),
    );

    await this._deps.agentRecords.delete(command.vault_id, command.root_agent_id);
    await this._appendAuditEntry(
      command.owner,
      "ownerRemoveAgentIdentity",
      { root_agent_id: command.root_agent_id },
      {
        root_agent_id: command.root_agent_id,
        revoked_session_tokens: tokens.length,
        removed_agent_secret_grants: grants.length,
      }
    );
  }

  async ownerCreateSecret(command: OwnerCreateSecretCommand): Promise<SecretRecord> {
    this._assertOwnerPrincipal(command.owner);
    await this._deps.policy.authorizeWrite(command);
    const existing = await this._deps.secrets.getByAlias(command.alias);
    if (existing) {
      throw new VaultCoreError(`secret alias already exists: "${command.alias}"`, "VAULT_ALIAS_ALREADY_EXISTS");
    }
    const secret_id = this._deps.ids.newSecretId();
    const now = this._deps.clock.nowIso();
    const record: SecretRecord = {
      vault_id: command.vault_id,
      secret_id,
      alias: command.alias,
      version: this._deps.ids.newVersion(),
      lifecycle_status: "ACTIVE",
      issuer_id: null,
      source: command.source ? (command.source.kind === "request" ? { kind: "request", request_id: command.source.request_id! } : { kind: "manual" }) : { kind: "manual" },
      created_at: now,
      updated_at: now,
    };
    await this._deps.secrets.save(record);
    await this._deps.custody.store(secret_id, command.plaintext);
    await this._appendAuditEntry(
      command.owner,
      "ownerCreateSecret",
      { secret_alias: command.alias, secret_id },
      record
    );
    return record;
  }

  async ownerUpdateSecret(command: OwnerUpdateSecretCommand): Promise<SecretRecord> {
    this._assertOwnerPrincipal(command.owner);
    await this._deps.policy.authorizeWrite(command);
    const existing = await this._deps.secrets.getByAlias(command.alias);
    if (!existing) throw new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");

    const finalAlias = command.new_alias && command.new_alias !== command.alias ? command.new_alias : command.alias;
    const isRename = finalAlias !== command.alias;

    if (isRename) {
      const duplicate = await this._deps.secrets.getByAlias(finalAlias);
      if (duplicate) {
        throw new VaultCoreError(`secret alias already exists: "${finalAlias}"`, "VAULT_ALIAS_ALREADY_EXISTS");
      }
    }

    const secret_id = existing.secret_id;
    const now = this._deps.clock.nowIso();

    const record: SecretRecord = {
      ...existing,
      alias: finalAlias,
      version: this._deps.ids.newVersion(),
      updated_at: now,
    };

    if (command.plaintext !== undefined) {
      await this._deps.custody.store(secret_id, command.plaintext);
    }

    await this._deps.secrets.save(record);
    await this._appendAuditEntry(
      command.owner,
      "ownerUpdateSecret",
      { secret_alias: finalAlias, secret_id },
      record
    );
    return record;
  }

  async ownerRemoveSecret(command: { kind: "owner.remove_secret"; vault_id: VaultId; request_id: string; owner: VaultPrincipal; alias: string; requested_at: string }) {
    this._assertOwnerPrincipal(command.owner);
    const record = await this._deps.secrets.getByAlias(command.alias);
    if (!record) throw new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");
    const [agentGrants, destinationGrants] = await Promise.all([
      this._deps.agent_secretGrants.list(command.vault_id),
      this._deps.secret_destinationGrants.list(command.vault_id, record.secret_id),
    ]);
    for (const grant of agentGrants) {
      if (grant.secret_id !== record.secret_id) continue;
      await this._deps.agent_secretGrants.delete(command.vault_id, grant.root_agent_id, grant.secret_id);
    }
    for (const grant of destinationGrants) {
      await this._deps.secret_destinationGrants.delete(command.vault_id, grant.secret_id, grant.site_id);
    }
    const now = this._deps.clock.nowIso();
    const removedRecord: SecretRecord = {
      ...record,
      lifecycle_status: "REMOVED",
      removedAt: now,
      updated_at: now,
    };
    await this._deps.secrets.save(removedRecord);
    await this._deps.custody.delete(record.secret_id);
    await this._appendAuditEntry(
      command.owner,
      "ownerRemoveSecret",
      { secret_alias: command.alias, secret_id: record.secret_id },
      {
        lifecycle_status: "REMOVED",
        removed_agent_secret_grants: agentGrants.filter((grant) => grant.secret_id === record.secret_id).length,
        removed_secret_destination_grants: destinationGrants.length,
      }
    );
  }

  async ownerReadAudit(actor: VaultPrincipal & { kind: "owner" }, query: AuditQuery): Promise<readonly AuditEntry[]> {
    this._assertOwnerPrincipal(actor);
    return this._deps.audit.query(query);
  }

  async ownerExportSecret(actor: VaultPrincipal & { kind: "owner" }, alias?: string): Promise<readonly OwnerSecretExport[]> {
    this._assertOwnerPrincipal(actor);

    if (alias) {
      const record = await this._deps.secrets.getByAlias(alias);
      if (!record) throw new VaultCoreError("secret not found", "VAULT_SECRET_NOT_FOUND");
      const plaintext = await this._deps.custody.load(record.secret_id);
      await this._appendAuditEntry(
        actor,
        "ownerExportSecret",
        { secret_alias: alias, secret_id: record.secret_id },
        undefined
      );
      return [{
        vault_id: this._deps.vault_id,
        secret_id: record.secret_id,
        alias: record.alias,
        plaintext: plaintext ?? "MISSING",
        exported_at: this._deps.clock.nowIso()
      }];
    }

    // Full Vault Export
    const records = await this._deps.secrets.list(this._deps.vault_id);
    const exports: OwnerSecretExport[] = await Promise.all(records.map(async record => {
      const plaintext = await this._deps.custody.load(record.secret_id);
      return {
        vault_id: this._deps.vault_id,
        secret_id: record.secret_id,
        alias: record.alias,
        plaintext: plaintext ?? "MISSING", // Should not happen in healthy vault
        exported_at: this._deps.clock.nowIso()
      };
    }));
    await this._appendAuditEntry(
      actor,
      "ownerExportSecret_batch",
      {},
      undefined
    );

    return exports;
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

  async ownerListRequests(actor: VaultPrincipal & { kind: "owner" }, root_agent_id?: string): Promise<readonly OwnerRequestRecord[]> {
    this._assertOwnerPrincipal(actor);
    const records = await this._deps.requests.list(this._deps.vault_id, root_agent_id);
    return records.map(r => this.toOwnerRequestRecord(r));
  }

  async ownerGetRequest(actor: VaultPrincipal & { kind: "owner" }, request_id: string): Promise<OwnerRequestRecord> {
    this._assertOwnerPrincipal(actor);
    const record = await this._deps.requests.get(this._deps.vault_id, request_id);
    if (!record) throw new VaultCoreError("request record not found", "VAULT_REQUEST_NOT_FOUND");
    return this.toOwnerRequestRecord(record);
  }

  async ownerListSecrets(actor: VaultPrincipal & { kind: "owner" }): Promise<readonly SecretRecord[]> {
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
    await this._appendAuditEntry(
      request.actor,
      "ownerIssueSessionToken",
      { root_agent_id: request.root_agent_id },
      { root_agent_id: request.root_agent_id, issued_at: this._deps.clock.nowIso() }
    );
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
    await this._appendAuditEntry(
      request.actor,
      "ownerRevokeSessionToken",
      { token: request.token },
      undefined
    );
  }
  ownerOnPendingDispatch(subscription: OwnerPendingDispatchSubscription): () => void {
    return this._deps.audit.subscribe(this._deps.vault_id, {
      function_names: ["agentDispatchSecret"],
      onEvent: async (entry) => {
        const request_id = entry.input?.request_id;
        if (!request_id) return;
        const record = await this._deps.requests.get(this._deps.vault_id, request_id);
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
    secret_id: SecretId | null = null,
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
        secret_id,
      },
      execution: { status },
    };
    await this._deps.requests.save(record);
  }

  private async _createInitialRequestRecord(request: DispatchRequest, secret_id: SecretId | null = null) {
    await this._recordRequestInternal(request, DispatchStatus.IN_PROGRESS, secret_id);
  }

  private async _updateRequestRecordInternal(
    request: DispatchRequest,
    result: DispatchResult,
    secret_id: SecretId | null = null,
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
        secret_id: secret_id,
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

  private toAgentRequestRecord(record: RequestRecord): AgentRequestRecord {
    return record;
  }

  private toOwnerRequestRecord(record: RequestRecord): OwnerRequestRecord {
    return record;
  }

  private async _appendAuditEntry(
    actor: VaultPrincipal,
    functionName: string,
    input: any,
    output?: any,
    error?: string
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      event_id: this._deps.ids.newAuditEntryId(),
      ts: this._deps.clock.nowIso(),
      vault_id: this._deps.vault_id,
      actor,
      function_name: functionName,
      input,
      output,
      error,
    };
    await this._appendAudit(entry);
    return entry;
  }
}

export function createVaultCore(deps: VaultCoreDependencies): VaultCore {
  return new VaultCore(deps);
}
