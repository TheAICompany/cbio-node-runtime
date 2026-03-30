import {
  createVaultCore,
  type VaultCore,
  type VaultCoreDependencies,
  type DispatchRequest,
  type DispatchResult,
  type Clock,
  type OwnerAuditRequest,
  type OwnerExportSecretRequest,
  type OwnerListAgentsRequest,
  type OwnerRegisterAgentIdentityCommand,

  type OwnerSecretExport,
  type SecretRecord,
  type AgentIdentityRecord,
  VaultPrincipal,
  VaultId,
  DispatchStatus,
} from "../vault-core/index.js";

export type RedactedResponseShape =
  | null
  | string
  | number
  | boolean
  | RedactedResponseShape[]
  | { [key: string]: RedactedResponseShape };

function redactResponseShapeValue(value: unknown): RedactedResponseShape {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactResponseShapeValue(entry));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactResponseShapeValue(entry)]),
    );
  }
  return null;
}

export interface VaultAgentDispatchRequest {
  vault_id: string;
  request_id: string;
  requested_at: string;
  root_agent_id: string;
  reason: string;
  secret_alias?: string;
  target_url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  proof: {
    signature?: string;
    token?: string;
  };
}

export interface VaultAgentDispatchResponse {
  ok: true;
  result: DispatchResult;
}

export interface VaultAgentDispatchErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export interface VaultAgentControlProof {
  signature?: string;
  token?: string;
}

export type VaultAgentControlRequest =
  | { action: "list_secrets"; vault_id: string; request_id: string; requested_at: string; root_agent_id: string; proof: VaultAgentControlProof }
  | { action: "list_requests"; vault_id: string; request_id: string; requested_at: string; root_agent_id: string; proof: VaultAgentControlProof }
  | { action: "read_request_result"; vault_id: string; request_id: string; requested_at: string; target_request_id: string; root_agent_id: string; proof: VaultAgentControlProof }
  | { action: "get_manifest"; vault_id: string; request_id: string; requested_at: string; root_agent_id: string; proof: VaultAgentControlProof };

export interface VaultAgentControlResponse {
  ok: true;
  result: unknown;
}

export interface VaultAgentControlErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type VaultOwnerControlRequest =
  | { action: "list_agents"; vault_id: string; actor_id?: string }
  | { action: "list_requests"; vault_id: string; actor_id?: string; root_agent_id?: string }
  | { action: "get_request"; vault_id: string; actor_id?: string; request_id: string }
  | { action: "list_secrets"; vault_id: string; actor_id?: string }
  | { action: "list_grants"; vault_id: string; actor_id?: string; root_agent_id?: string; secret_alias?: string }
  | { action: "approve_dispatch"; vault_id: string; request_id: string; actor_id?: string; decision: import("../vault-core/index.js").DispatchApprovalDecision }
  | { action: "create_secret"; vault_id: string; actor_id?: string; alias: string; plaintext: string; requested_at?: string }
  | { action: "update_secret"; vault_id: string; actor_id?: string; alias: string; new_alias?: string; plaintext?: string; requested_at?: string }
  | { action: "remove_secret"; vault_id: string; actor_id?: string; alias: string; requested_at?: string };

export interface VaultOwnerControlResponse {
  ok: true;
  result: unknown;
}

export interface VaultOwnerControlErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export interface VaultService {
  readonly vault_id: VaultCore["vault_id"];
  
  // Owner Management
  ownerRegisterAgentIdentity(request: OwnerRegisterAgentIdentityCommand): Promise<void>;
  ownerUpdateAgentIdentity(request: import("../vault-core/index.js").OwnerUpdateAgentIdentityCommand): Promise<AgentIdentityRecord>;

  ownerCreateSecret(request: import("../vault-core/index.js").OwnerCreateSecretCommand): Promise<SecretRecord>;
  ownerUpdateSecret(request: import("../vault-core/index.js").OwnerUpdateSecretCommand): Promise<SecretRecord>;
  ownerRemoveSecret(request: import("../vault-core/index.js").OwnerDeleteSecretCommand): Promise<void>;
  ownerReadAudit(request: OwnerAuditRequest): Promise<readonly import("../vault-core/index.js").AuditEntry[]>;
  ownerExportSecret(request: OwnerExportSecretRequest): Promise<readonly OwnerSecretExport[]>;
  ownerListAgents(request: OwnerListAgentsRequest): Promise<readonly AgentIdentityRecord[]>;
  ownerListRequests(request: import("../vault-core/index.js").OwnerListRequestsRequest): Promise<readonly import("../vault-core/index.js").OwnerVisibleRequestRecord[]>;
  ownerGetRequest(request: import("../vault-core/index.js").OwnerGetRequestRequest): Promise<import("../vault-core/index.js").OwnerRequestRecord>;
  ownerListSecrets(request: { vault_id: VaultId; owner: VaultPrincipal; request_id?: string }): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]>;
  
  // Grant Management
  ownerGrantAgentSecret(request: import("../vault-core/index.js").OwnerGrantAgentSecretCommand): Promise<import("../vault-core/index.js").AgentSecretGrant>;
  ownerGrantSecretDestination(request: import("../vault-core/index.js").OwnerGrantSecretDestinationCommand): Promise<import("../vault-core/index.js").SecretDestinationGrant>;
  ownerRevokeAgentSecret(request: import("../vault-core/index.js").OwnerRevokeAgentSecretCommand): Promise<void>;
  ownerRevokeSecretDestination(request: import("../vault-core/index.js").OwnerRevokeSecretDestinationCommand): Promise<void>;
  ownerListGrants(request: import("../vault-core/index.js").OwnerListGrantsRequest): Promise<{ 
    agent_secrets: readonly import("../vault-core/index.js").AgentSecretGrant[], 
    secret_destinations: readonly import("../vault-core/index.js").SecretDestinationGrant[] 
  }>;

  // Session Management
  ownerIssueSessionToken(request: import("../vault-core/index.js").OwnerIssueSessionTokenRequest): Promise<import("../vault-core/index.js").OwnerSessionToken>;
  ownerIssueAllAgentSessionTokens(actor: VaultPrincipal & { kind: "owner" }): Promise<import("../vault-core/index.js").OwnerSessionToken[]>;
  ownerRevokeSessionToken(request: { vault_id: VaultId; actor: VaultPrincipal & { kind: "owner" }; token: string }): Promise<void>;

  // Dispatch & Approval
  agentDispatch(request: DispatchRequest): Promise<DispatchResult>;
  ownerApproveDispatch(request: import("../vault-core/index.js").OwnerApproveDispatchCommand): Promise<DispatchResult | null>;
  ownerOnPendingDispatch(subscription: import("../vault-core/index.js").OwnerPendingDispatchSubscription): () => void;
  ownerOnAudit(subscription: import("../vault-core/index.js").OwnerAuditSubscription): () => void;

  // Agent Control
  agentListSecrets(request: import("../vault-core/index.js").AgentListSecretsRequest): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]>;
  agentListRequests(request: import("../vault-core/index.js").AgentListRequestsRequest): Promise<readonly import("../vault-core/index.js").AgentVisibleRequestRecord[]>;
  agentGetRequest(request: import("../vault-core/index.js").AgentGetRequestRequest): Promise<import("../vault-core/index.js").AgentRequestResult>;
  agentGetRuntimeManifest(request: import("../vault-core/index.js").AgentGetRuntimeManifestRequest): Promise<import("../vault-core/index.js").AgentRuntimeManifest>;
  

  
  // Protocols
  agentHandleDispatch(request: VaultAgentDispatchRequest): Promise<VaultAgentDispatchResponse | VaultAgentDispatchErrorResponse>;
  agentHandleControl(request: VaultAgentControlRequest): Promise<VaultAgentControlResponse | VaultAgentControlErrorResponse>;
  ownerHandleControl(request: VaultOwnerControlRequest): Promise<VaultOwnerControlResponse | VaultOwnerControlErrorResponse>;
}



class LocalVaultService implements VaultService {
  constructor(
    private readonly _authority: VaultCore,
    private readonly _fetchImpl: typeof fetch = fetch,
  ) {}

  get vault_id() {
    return this._authority.vault_id;
  }

  ownerRegisterAgentIdentity(request: OwnerRegisterAgentIdentityCommand): Promise<void> {
    return this._authority.ownerRegisterAgentIdentity(request);
  }

  ownerUpdateAgentIdentity(request: import("../vault-core/index.js").OwnerUpdateAgentIdentityCommand): Promise<AgentIdentityRecord> {
    return this._authority.ownerUpdateAgentIdentity(request);
  }



  ownerCreateSecret(request: import("../vault-core/index.js").OwnerCreateSecretCommand): Promise<SecretRecord> {
    return this._authority.ownerCreateSecret(request);
  }

  ownerUpdateSecret(request: import("../vault-core/index.js").OwnerUpdateSecretCommand): Promise<SecretRecord> {
    return this._authority.ownerUpdateSecret(request);
  }

  ownerRemoveSecret(request: import("../vault-core/index.js").OwnerDeleteSecretCommand): Promise<void> {
    return this._authority.ownerRemoveSecret(request);
  }

  ownerReadAudit(request: OwnerAuditRequest): Promise<readonly import("../vault-core/index.js").AuditEntry[]> {
    return this._authority.ownerReadAudit(request.actor as any, request.query);
  }

  ownerExportSecret(request: OwnerExportSecretRequest): Promise<readonly OwnerSecretExport[]> {
    return this._authority.ownerExportSecret(request.actor as any, request.alias);
  }

  ownerListAgents(request: OwnerListAgentsRequest): Promise<readonly AgentIdentityRecord[]> {
    return this._authority.ownerListAgents(request.actor);
  }

  ownerListRequests(request: import("../vault-core/index.js").OwnerListRequestsRequest): Promise<readonly import("../vault-core/index.js").OwnerVisibleRequestRecord[]> {
    return this._authority.ownerListRequests(request.actor as any, request.root_agent_id);
  }

  ownerGetRequest(request: import("../vault-core/index.js").OwnerGetRequestRequest): Promise<import("../vault-core/index.js").OwnerRequestRecord> {
    return this._authority.ownerGetRequest(request.actor as any, request.target_request_id);
  }

  ownerListSecrets(request: { vault_id: VaultId; owner: VaultPrincipal; request_id?: string }): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]> {
    return this._authority.ownerListSecrets(request.owner as any);
  }

  async ownerGrantAgentSecret(request: import("../vault-core/index.js").OwnerGrantAgentSecretCommand): Promise<import("../vault-core/index.js").AgentSecretGrant> {
    const secret_id = (request as any).secret_id;
    if (!secret_id) throw new Error("secret_id required for grant");
    return this._authority.ownerGrantAgentSecret(request.actor as any, request.root_agent_id, secret_id, request);
  }

  async ownerGrantSecretDestination(request: import("../vault-core/index.js").OwnerGrantSecretDestinationCommand): Promise<import("../vault-core/index.js").SecretDestinationGrant> {
    const secret_id = (request as any).secret_id;
    if (!secret_id) throw new Error("secret_id required for grant");
    return this._authority.ownerGrantSecretDestination(request.actor as any, secret_id, request.site_id, request);
  }

  async ownerRevokeAgentSecret(request: import("../vault-core/index.js").OwnerRevokeAgentSecretCommand): Promise<void> {
    const secret_id = (request as any).secret_id;
    if (!secret_id) throw new Error("secret_id required for grant");
    return this._authority.ownerRevokeAgentSecret(request.actor as any, request.root_agent_id, secret_id, request);
  }

  async ownerRevokeSecretDestination(request: import("../vault-core/index.js").OwnerRevokeSecretDestinationCommand): Promise<void> {
    const secret_id = (request as any).secret_id;
    if (!secret_id) throw new Error("secret_id required for grant");
    return this._authority.ownerRevokeSecretDestination(request.actor as any, secret_id, request.site_id, request);
  }

  async ownerListGrants(request: import("../vault-core/index.js").OwnerListGrantsRequest): Promise<{ 
    agent_secrets: readonly import("../vault-core/index.js").AgentSecretGrant[], 
    secret_destinations: readonly import("../vault-core/index.js").SecretDestinationGrant[] 
  }> {
    const secret_id = (request as any).secret_id;
    return this._authority.ownerListGrants(request.actor as any, request.root_agent_id, secret_id);
  }

  ownerIssueSessionToken(request: import("../vault-core/index.js").OwnerIssueSessionTokenRequest): Promise<import("../vault-core/index.js").OwnerSessionToken> {
    return this._authority.ownerIssueSessionToken(request);
  }

  ownerIssueAllAgentSessionTokens(actor: VaultPrincipal & { kind: "owner" }): Promise<import("../vault-core/index.js").OwnerSessionToken[]> {
    return this._authority.ownerIssueAllAgentSessionTokens(actor);
  }

  ownerRevokeSessionToken(request: { vault_id: VaultId; actor: VaultPrincipal & { kind: "owner" }; token: string }): Promise<void> {
    return this._authority.ownerRevokeSessionToken(request);
  }

  agentDispatch(request: DispatchRequest): Promise<DispatchResult> {
    return this._authority.agentDispatchSecret(request);
  }

  ownerApproveDispatch(request: import("../vault-core/index.js").OwnerApproveDispatchCommand): Promise<DispatchResult | null> {
    return this._authority.ownerApproveDispatch(request.actor as any, request.request_id, request.decision);
  }

  ownerOnPendingDispatch(subscription: import("../vault-core/index.js").OwnerPendingDispatchSubscription): () => void {
    return this._authority.ownerOnPendingDispatch(subscription);
  }
  ownerOnAudit(subscription: import("../vault-core/index.js").OwnerAuditSubscription): () => void {
    return this._authority.ownerOnAudit(subscription);
  }

  agentListSecrets(request: import("../vault-core/index.js").AgentListSecretsRequest): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]> {
    return this._authority.agentListSecrets(request);
  }

  agentListRequests(request: import("../vault-core/index.js").AgentListRequestsRequest): Promise<readonly import("../vault-core/index.js").AgentVisibleRequestRecord[]> {
    return this._authority.agentListRequests(request);
  }

  agentGetRequest(request: import("../vault-core/index.js").AgentGetRequestRequest): Promise<import("../vault-core/index.js").AgentRequestResult> {
    return this._authority.agentGetRequest(request);
  }

  agentGetRuntimeManifest(request: import("../vault-core/index.js").AgentGetRuntimeManifestRequest): Promise<import("../vault-core/index.js").AgentRuntimeManifest> {
    return this._authority.agentGetRuntimeManifest(request);
  }

  async agentHandleDispatch(request: VaultAgentDispatchRequest): Promise<VaultAgentDispatchResponse | VaultAgentDispatchErrorResponse> {
    try {
      const result = await this._authority.agentDispatchSecret({
        vault_id: { value: request.vault_id },
        request_id: request.request_id,
        requested_at: request.requested_at,
        agent: { kind: "agent", id: request.root_agent_id },
        proof: {
          root_agent_id: request.root_agent_id,
          signature: request.proof.signature,
          token: request.proof.token,
          request_id: request.request_id,
          requested_at: request.requested_at,
        },
        reason: request.reason,
        secret_alias: request.secret_alias,
        target_url: request.target_url,
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      return { ok: true, result };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: (error as any).code || "VAULT_DISPATCH_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  async agentHandleControl(request: VaultAgentControlRequest): Promise<VaultAgentControlResponse | VaultAgentControlErrorResponse> {
    try {
      const base = {
        vault_id: { value: request.vault_id },
        request_id: request.request_id,
        requested_at: request.requested_at,
        agent: { kind: "agent" as const, id: request.root_agent_id },
        proof: {
          root_agent_id: request.root_agent_id,
          signature: request.proof.signature,
          token: request.proof.token,
          request_id: request.request_id,
          requested_at: request.requested_at,
        },
      };
      let result: any;
      switch (request.action) {
        case "list_secrets": result = await this.agentListSecrets(base); break;
        case "list_requests": result = await this.agentListRequests(base); break;
        case "read_request_result": result = await this.agentGetRequest({ ...base, target_request_id: request.target_request_id }); break;
        case "get_manifest": result = await this.agentGetRuntimeManifest(base); break;
      }
      return { ok: true, result };
    } catch (error) {
      return { ok: false, error: { code: (error as any).code || "VAULT_CONTROL_FAILED", message: error instanceof Error ? error.message : String(error) } };
    }
  }

  async ownerHandleControl(request: VaultOwnerControlRequest): Promise<VaultOwnerControlResponse | VaultOwnerControlErrorResponse> {
    try {
      const actor = { kind: "owner" as const, id: request.actor_id || "owner" };
      let result: any;
      switch (request.action) {
        case "list_agents": result = await this.ownerListAgents({ vault_id: { value: request.vault_id }, actor: { kind: "owner", id: request.actor_id || "owner" }, request_id: "internal", requested_at: new Date().toISOString() }); break;
        case "list_requests": result = await this.ownerListRequests({ vault_id: { value: request.vault_id }, actor: { kind: "owner", id: request.actor_id || "owner" }, root_agent_id: request.root_agent_id, request_id: "internal", requested_at: new Date().toISOString() }); break;
        case "get_request": result = await this.ownerGetRequest({ vault_id: { value: request.vault_id }, actor: { kind: "owner", id: request.actor_id || "owner" }, target_request_id: request.request_id, request_id: "internal", requested_at: new Date().toISOString() }); break;
        case "list_secrets": result = await this.ownerListSecrets({ vault_id: { value: request.vault_id }, owner: { kind: "owner", id: request.actor_id || "owner" } }); break;
        case "list_grants": result = await this.ownerListGrants({ vault_id: { value: request.vault_id }, actor: { kind: "owner", id: request.actor_id || "owner" }, root_agent_id: request.root_agent_id, secret_alias: request.secret_alias, request_id: "internal", requested_at: new Date().toISOString() }); break;
        case "approve_dispatch": result = await this.ownerApproveDispatch({ vault_id: { value: request.vault_id }, actor: { kind: "owner", id: request.actor_id || "owner" }, request_id: request.request_id, decision: request.decision, requested_at: new Date().toISOString() }); break;
        case "create_secret": result = await this.ownerCreateSecret({ kind: "owner.create_secret", vault_id: { value: request.vault_id }, owner: actor, request_id: "internal", alias: request.alias, plaintext: request.plaintext, requested_at: request.requested_at || new Date().toISOString() }); break;
        case "update_secret": result = await this.ownerUpdateSecret({ kind: "owner.update_secret", vault_id: { value: request.vault_id }, owner: actor, request_id: "internal", alias: request.alias, new_alias: request.new_alias, plaintext: request.plaintext, requested_at: request.requested_at || new Date().toISOString() }); break;
        case "remove_secret": await this.ownerRemoveSecret({ kind: "owner.remove_secret", vault_id: { value: request.vault_id }, owner: actor, request_id: "internal", alias: request.alias, requested_at: request.requested_at || new Date().toISOString() }); result = { ok: true }; break;
      }
      return { ok: true, result };
    } catch (error) {
      return { ok: false, error: { code: (error as any).code || "VAULT_CONTROL_FAILED", message: error instanceof Error ? error.message : String(error) } };
    }
  }
}

export function createVaultService(authority: VaultCore, options?: { fetchImpl?: typeof fetch }): VaultService {
  return new LocalVaultService(authority, options?.fetchImpl);
}

/** Legacy alias for createVaultService */
export const wrapVaultCoreAsVaultService = createVaultService;
