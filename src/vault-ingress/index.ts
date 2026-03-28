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
  vaultId: string;
  requestId: string;
  requestedAt: string;
  rootAgentId: string;
  reason: string;
  secretAlias?: string;
  targetUrl: string;
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
  | { action: "list_secrets"; vaultId: string; requestId: string; requestedAt: string; rootAgentId: string; proof: VaultAgentControlProof }
  | { action: "list_requests"; vaultId: string; requestId: string; requestedAt: string; rootAgentId: string; proof: VaultAgentControlProof }
  | { action: "read_request_result"; vaultId: string; requestId: string; requestedAt: string; targetRequestId: string; rootAgentId: string; proof: VaultAgentControlProof }
  | { action: "get_manifest"; vaultId: string; requestId: string; requestedAt: string; rootAgentId: string; proof: VaultAgentControlProof };

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
  | { action: "list_agents"; vaultId: string; actorId?: string }
  | { action: "list_requests"; vaultId: string; actorId?: string; rootAgentId?: string }
  | { action: "get_request"; vaultId: string; actorId?: string; requestId: string }
  | { action: "list_secrets"; vaultId: string; actorId?: string }
  | { action: "list_grants"; vaultId: string; actorId?: string; rootAgentId?: string; secretAlias?: string }
  | { action: "approve_dispatch"; vaultId: string; requestId: string; actorId?: string; decision: import("../vault-core/index.js").DispatchApprovalDecision };

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
  readonly vaultId: VaultCore["vaultId"];
  
  // Owner Management
  ownerRegisterAgentIdentity(request: OwnerRegisterAgentIdentityCommand): Promise<void>;
  ownerUpdateAgentIdentity(request: import("../vault-core/index.js").OwnerUpdateAgentIdentityCommand): Promise<AgentIdentityRecord>;

  ownerCreateSecret(request: import("../vault-core/index.js").OwnerCreateSecretCommand): Promise<SecretRecord>;
  ownerUpdateSecret(request: import("../vault-core/index.js").OwnerUpdateSecretCommand): Promise<SecretRecord>;
  ownerRemoveSecret(request: import("../vault-core/index.js").OwnerDeleteSecretCommand): Promise<void>;
  ownerWriteSecret(request: import("../vault-core/index.js").VaultWriteSecretCommand): Promise<SecretRecord>;
  ownerReadAudit(request: OwnerAuditRequest): Promise<readonly import("../vault-core/index.js").AuditEntry[]>;
  ownerExportSecret(request: OwnerExportSecretRequest): Promise<OwnerSecretExport>;
  ownerListAgents(request: OwnerListAgentsRequest): Promise<readonly AgentIdentityRecord[]>;
  ownerListRequests(request: import("../vault-core/index.js").OwnerListRequestsRequest): Promise<readonly import("../vault-core/index.js").OwnerVisibleRequestRecord[]>;
  ownerGetRequest(request: import("../vault-core/index.js").OwnerGetRequestRequest): Promise<import("../vault-core/index.js").OwnerRequestRecord>;
  ownerListSecrets(request: { vaultId: VaultId; owner: VaultPrincipal; requestId?: string }): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]>;
  
  // Grant Management
  ownerGrantAgentSecret(request: import("../vault-core/index.js").OwnerGrantAgentSecretCommand): Promise<import("../vault-core/index.js").AgentSecretGrant>;
  ownerGrantSecretDestination(request: import("../vault-core/index.js").OwnerGrantSecretDestinationCommand): Promise<import("../vault-core/index.js").SecretDestinationGrant>;
  ownerRevokeAgentSecret(request: import("../vault-core/index.js").OwnerRevokeAgentSecretCommand): Promise<void>;
  ownerRevokeSecretDestination(request: import("../vault-core/index.js").OwnerRevokeSecretDestinationCommand): Promise<void>;
  ownerListGrants(request: import("../vault-core/index.js").OwnerListGrantsRequest): Promise<{ 
    agentSecrets: readonly import("../vault-core/index.js").AgentSecretGrant[], 
    secretDestinations: readonly import("../vault-core/index.js").SecretDestinationGrant[] 
  }>;

  // Session Management
  ownerIssueSessionToken(request: import("../vault-core/index.js").OwnerIssueSessionTokenRequest): Promise<import("../vault-core/index.js").OwnerSessionToken>;
  ownerIssueAllAgentSessionTokens(actor: VaultPrincipal & { kind: "owner" }): Promise<import("../vault-core/index.js").OwnerSessionToken[]>;
  ownerRevokeSessionToken(request: { vaultId: VaultId; actor: VaultPrincipal & { kind: "owner" }; token: string }): Promise<void>;

  // Dispatch & Approval
  agentDispatch(request: DispatchRequest): Promise<DispatchResult>;
  ownerApproveDispatch(request: import("../vault-core/index.js").OwnerApproveDispatchCommand): Promise<DispatchResult | null>;
  ownerOnPendingDispatch(callback: (record: import("../vault-core/index.js").RequestRecord) => void): () => void;

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

  get vaultId() {
    return this._authority.vaultId;
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

  ownerWriteSecret(request: import("../vault-core/index.js").VaultWriteSecretCommand): Promise<SecretRecord> {
    return this._authority.ownerWriteSecret(request);
  }

  ownerReadAudit(request: OwnerAuditRequest): Promise<readonly import("../vault-core/index.js").AuditEntry[]> {
    return this._authority.ownerReadAudit(request.actor as any, request.query);
  }

  ownerExportSecret(request: OwnerExportSecretRequest): Promise<OwnerSecretExport> {
    return this._authority.ownerExportSecret(request.actor as any, request.alias);
  }

  ownerListAgents(request: OwnerListAgentsRequest): Promise<readonly AgentIdentityRecord[]> {
    return this._authority.ownerListAgents(request.actor);
  }

  ownerListRequests(request: import("../vault-core/index.js").OwnerListRequestsRequest): Promise<readonly import("../vault-core/index.js").OwnerVisibleRequestRecord[]> {
    return this._authority.ownerListRequests(request.actor as any, request.rootAgentId);
  }

  ownerGetRequest(request: import("../vault-core/index.js").OwnerGetRequestRequest): Promise<import("../vault-core/index.js").OwnerRequestRecord> {
    return this._authority.ownerGetRequest(request.actor as any, request.targetRequestId);
  }

  ownerListSecrets(request: { vaultId: VaultId; owner: VaultPrincipal; requestId?: string }): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]> {
    return this._authority.ownerListSecrets(request.owner as any);
  }

  ownerGrantAgentSecret(request: import("../vault-core/index.js").OwnerGrantAgentSecretCommand): Promise<import("../vault-core/index.js").AgentSecretGrant> {
    return this._authority.ownerGrantAgentSecret(request.actor as any, request.rootAgentId, request.secretAlias, request);
  }

  ownerGrantSecretDestination(request: import("../vault-core/index.js").OwnerGrantSecretDestinationCommand): Promise<import("../vault-core/index.js").SecretDestinationGrant> {
    return this._authority.ownerGrantSecretDestination(request.actor as any, request.secretAlias, request.siteId, request);
  }

  ownerRevokeAgentSecret(request: import("../vault-core/index.js").OwnerRevokeAgentSecretCommand): Promise<void> {
    return this._authority.ownerRevokeAgentSecret(request.actor as any, request.rootAgentId, request.secretAlias, request);
  }

  ownerRevokeSecretDestination(request: import("../vault-core/index.js").OwnerRevokeSecretDestinationCommand): Promise<void> {
    return this._authority.ownerRevokeSecretDestination(request.actor as any, request.secretAlias, request.siteId, request);
  }

  ownerListGrants(request: import("../vault-core/index.js").OwnerListGrantsRequest): Promise<{ 
    agentSecrets: readonly import("../vault-core/index.js").AgentSecretGrant[], 
    secretDestinations: readonly import("../vault-core/index.js").SecretDestinationGrant[] 
  }> {
    return this._authority.ownerListGrants(request.actor as any, request.rootAgentId, request.secretAlias);
  }

  ownerIssueSessionToken(request: import("../vault-core/index.js").OwnerIssueSessionTokenRequest): Promise<import("../vault-core/index.js").OwnerSessionToken> {
    return this._authority.ownerIssueSessionToken(request);
  }

  ownerIssueAllAgentSessionTokens(actor: VaultPrincipal & { kind: "owner" }): Promise<import("../vault-core/index.js").OwnerSessionToken[]> {
    return this._authority.ownerIssueAllAgentSessionTokens(actor);
  }

  ownerRevokeSessionToken(request: { vaultId: VaultId; actor: VaultPrincipal & { kind: "owner" }; token: string }): Promise<void> {
    return this._authority.ownerRevokeSessionToken(request);
  }

  agentDispatch(request: DispatchRequest): Promise<DispatchResult> {
    return this._authority.agentDispatchSecret(request);
  }

  ownerApproveDispatch(request: import("../vault-core/index.js").OwnerApproveDispatchCommand): Promise<DispatchResult | null> {
    return this._authority.ownerApproveDispatch(request.actor as any, request.requestId, request.decision);
  }

  ownerOnPendingDispatch(callback: (record: import("../vault-core/index.js").RequestRecord) => void): () => void {
    return this._authority.ownerOnPendingDispatch(callback);
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
        vaultId: { value: request.vaultId },
        requestId: request.requestId,
        requestedAt: request.requestedAt,
        agent: { kind: "agent", id: request.rootAgentId },
        proof: {
          rootAgentId: request.rootAgentId,
          signature: request.proof.signature,
          token: request.proof.token,
          requestId: request.requestId,
          requestedAt: request.requestedAt,
        },
        reason: request.reason,
        secretAlias: request.secretAlias,
        targetUrl: request.targetUrl,
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
        vaultId: { value: request.vaultId },
        requestId: request.requestId,
        requestedAt: request.requestedAt,
        agent: { kind: "agent" as const, id: request.rootAgentId },
        proof: {
          rootAgentId: request.rootAgentId,
          signature: request.proof.signature,
          token: request.proof.token,
          requestId: request.requestId,
          requestedAt: request.requestedAt,
        },
      };
      let result: any;
      switch (request.action) {
        case "list_secrets": result = await this.agentListSecrets(base); break;
        case "list_requests": result = await this.agentListRequests(base); break;
        case "read_request_result": result = await this.agentGetRequest({ ...base, targetRequestId: request.targetRequestId }); break;
        case "get_manifest": result = await this.agentGetRuntimeManifest(base); break;
      }
      return { ok: true, result };
    } catch (error) {
      return { ok: false, error: { code: (error as any).code || "VAULT_CONTROL_FAILED", message: error instanceof Error ? error.message : String(error) } };
    }
  }

  async ownerHandleControl(request: VaultOwnerControlRequest): Promise<VaultOwnerControlResponse | VaultOwnerControlErrorResponse> {
    try {
      const actor = { kind: "owner" as const, id: request.actorId || "owner" };
      let result: any;
      switch (request.action) {
        case "list_agents": result = await this.ownerListAgents({ vaultId: { value: request.vaultId }, actor: { kind: "owner", id: request.actorId || "owner" }, requestId: "internal", requestedAt: new Date().toISOString() }); break;
        case "list_requests": result = await this.ownerListRequests({ vaultId: { value: request.vaultId }, actor: { kind: "owner", id: request.actorId || "owner" }, rootAgentId: request.rootAgentId, requestId: "internal", requestedAt: new Date().toISOString() }); break;
        case "get_request": result = await this.ownerGetRequest({ vaultId: { value: request.vaultId }, actor: { kind: "owner", id: request.actorId || "owner" }, targetRequestId: request.requestId, requestId: "internal", requestedAt: new Date().toISOString() }); break;
        case "list_secrets": result = await this.ownerListSecrets({ vaultId: { value: request.vaultId }, owner: { kind: "owner", id: request.actorId || "owner" } }); break;
        case "list_grants": result = await this.ownerListGrants({ vaultId: { value: request.vaultId }, actor: { kind: "owner", id: request.actorId || "owner" }, rootAgentId: request.rootAgentId, secretAlias: request.secretAlias, requestId: "internal", requestedAt: new Date().toISOString() }); break;
        case "approve_dispatch": result = await this.ownerApproveDispatch({ vaultId: { value: request.vaultId }, actor: { kind: "owner", id: request.actorId || "owner" }, requestId: request.requestId, decision: request.decision, requestedAt: new Date().toISOString() }); break;
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
