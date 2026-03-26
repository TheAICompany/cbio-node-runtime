import {
  createVaultCore,
  type AgentCapability,
  type VaultTargetBinding,
  type VaultCore,
  type VaultCoreDependencies,
  type DispatchRequest,
  type DispatchResult,
  type Clock,
  type OwnerAuditRequest,
  type OwnerExportSecretRequest,
  type OwnerRegisterCapabilityCommand,
  type OwnerRevokeCapabilityCommand,
  type OwnerListAgentsRequest,
  type OwnerListCapabilitiesRequest,
  type OwnerRegisterAgentIdentityCommand,
  type OwnerRegisterCustomHttpFlowCommand,
  type CustomHttpFlowDefinition,
  type OwnerSecretExport,
  type SecretRecord,
  type AgentIdentityRecord,
  VaultPrincipal,
  VaultId,
  DispatchStatus,
} from "../vault-core/index.js";
import {
  createOwnerHttpFlowBoundary,
  createStandardAcquireBoundary,
  toOwnerHttpFlowBoundary,
} from "./flow-factories.js";

export type RedactedResponseShape =
  | null
  | string
  | number
  | boolean
  | RedactedResponseShape[]
  | { [key: string]: RedactedResponseShape };

export type VaultAcquireSecretFlow =
  | "oauth_token_response.access_token"
  | "oauth_token_response.refresh_token"
  | "openid_token_response.id_token";

export interface VaultAgentDispatchRequest {
  vaultId: string;
  requestId: string;
  requestedAt: string;
  agentId: string;
  capabilityId?: string;
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

export interface VaultAcquireSecretInput {
  alias: string;
  issuerId: string;
  url: string;
  flow: VaultAcquireSecretFlow;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  requestedAt?: string;
}

export interface VaultAcquireSecretResult {
  vaultId: VaultId;
  alias: string;
  status: "stored";
  responseStatus: number;
  contentType: string | null;
  responseShape: RedactedResponseShape;
}

interface ParsedResponsePayload {
  contentType: string | null;
  rawBody: string;
  parsedBody: unknown;
  responseStatus: number;
}

export interface VaultAgentControlProof {
  signature?: string;
  token?: string;
}

export type VaultAgentControlRequest =
  | {
      action: "list_capabilities";
      vaultId: string;
      requestId: string;
      requestedAt: string;
      agentId: string;
      proof: VaultAgentControlProof;
    }
  | {
      action: "list_secrets";
      vaultId: string;
      requestId: string;
      requestedAt: string;
      agentId: string;
      proof: VaultAgentControlProof;
    }
  | {
      action: "submit_capability_request";
      vaultId: string;
      requestId: string;
      requestedAt: string;
      agentId: string;
      proof: VaultAgentControlProof;
      scope: string;
      methods: string[];
      operation?: "dispatch_http" | "custom_http";
      secretAliases?: string[];
      justification?: string;
    };

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
  | {
      action: "list_pending_dispatches";
      vaultId: string;
      ownerId?: string;
    }
  | {
      action: "approve_dispatch";
      vaultId: string;
      requestId: string;
      ownerId?: string;
      permanent?: boolean;
      skipAudit?: boolean;
    }
  | {
      action: "reject_dispatch";
      vaultId: string;
      requestId: string;
      ownerId?: string;
    }
  | {
      action: "list_pending_capability_requests";
      vaultId: string;
      ownerId?: string;
    }
  | {
      action: "approve_capability_request";
      vaultId: string;
      requestId: string;
      ownerId?: string;
      capabilityId?: string;
    }
  | {
      action: "reject_capability_request";
      vaultId: string;
      requestId: string;
      ownerId?: string;
    }
  | {
      action: "list_agents";
      vaultId: string;
      ownerId?: string;
    }
  | {
      action: "list_capabilities";
      vaultId: string;
      ownerId?: string;
      agentId?: string;
    }
  | {
      action: "list_secrets";
      vaultId: string;
      ownerId?: string;
    };

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

export interface VaultCustomFlowResolver {
  get(vaultId: VaultId, flowId: string): Promise<CustomHttpFlowDefinition | null>;
}

export interface VaultService {
  readonly vaultId: VaultCore["vaultId"];
  ownerRegisterCapability(request: OwnerRegisterCapabilityCommand): Promise<void>;
  ownerRegisterAgentIdentity(request: OwnerRegisterAgentIdentityCommand): Promise<void>;
  ownerRegisterCustomFlow(request: OwnerRegisterCustomHttpFlowCommand): Promise<void>;
  ownerWriteSecret(request: import("../vault-core/index.js").VaultWriteSecretCommand): Promise<SecretRecord>;
  ownerDefineSecretTargets(request: import("../vault-core/index.js").OwnerDefineSecretTargetsCommand): Promise<SecretRecord>;
  acquireSecret(request: VaultAcquireSecretInput): Promise<VaultAcquireSecretResult>;
  agentDispatch(request: DispatchRequest): Promise<DispatchResult>;
  agentHandleDispatch(request: VaultAgentDispatchRequest): Promise<VaultAgentDispatchResponse | VaultAgentDispatchErrorResponse>;
  ownerReadAudit(request: OwnerAuditRequest): Promise<readonly import("../vault-core/index.js").AuditEntry[]>;
  ownerExportSecret(request: OwnerExportSecretRequest): Promise<OwnerSecretExport>;
  ownerDeleteSecret(request: import("../vault-core/index.js").OwnerDeleteSecretCommand): Promise<void>;
  ownerListAgents(request: OwnerListAgentsRequest): Promise<readonly AgentIdentityRecord[]>;
  ownerListCapabilities(request: OwnerListCapabilitiesRequest): Promise<readonly AgentCapability[]>;
  ownerListSecrets(request: { vaultId: VaultId; owner: VaultPrincipal; requestId?: string }): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]>;
  ownerRevokeCapability(request: OwnerRevokeCapabilityCommand): Promise<void>;
  ownerIssueSessionToken(request: import("../vault-core/index.js").OwnerIssueSessionTokenRequest): Promise<import("../vault-core/index.js").OwnerSessionToken>;
  ownerIssueAllAgentSessionTokens(request: { vaultId: VaultId; actor: VaultPrincipal & { kind: "owner" } }): Promise<import("../vault-core/index.js").OwnerSessionToken[]>;
  ownerRevokeSessionToken(request: { vaultId: VaultId; actor: VaultPrincipal & { kind: "owner" }; token: string }): Promise<void>;
  ownerSubmitCapabilityRequest(request: import("../vault-core/index.js").SubmitCapabilityRequestCommand): Promise<import("../vault-core/index.js").PendingCapabilityRequestRecord>;
  ownerListPendingCapabilityRequests(request: { vaultId: VaultId; owner: VaultPrincipal }): Promise<readonly import("../vault-core/index.js").PendingCapabilityRequestRecord[]>;
  ownerApproveCapabilityRequest(request: import("../vault-core/index.js").OwnerApproveCapabilityRequestCommand): Promise<AgentCapability>;
  ownerRejectCapabilityRequest(request: import("../vault-core/index.js").OwnerRejectCapabilityRequestCommand): Promise<void>;
  ownerListPendingDispatches(request: { vaultId: VaultId; owner: VaultPrincipal }): Promise<readonly import("../vault-core/index.js").PendingDispatchRecord[]>;
  ownerApproveDispatch(request: import("../vault-core/index.js").OwnerApproveDispatchCommand): Promise<DispatchResult>;
  ownerRejectDispatch(request: import("../vault-core/index.js").OwnerRejectDispatchCommand): Promise<void>;
  ownerOnPendingDispatch(callback: (record: import("../vault-core/index.js").PendingDispatchRecord) => void): () => void;
  ownerOnPendingCapabilityRequest(callback: (record: import("../vault-core/index.js").PendingCapabilityRequestRecord) => void): () => void;
  agentListCapabilities(request: import("../vault-core/index.js").AgentListCapabilitiesRequest): Promise<readonly AgentCapability[]>;
  agentListSecrets(request: import("../vault-core/index.js").AgentListSecretsRequest): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]>;
  agentSubmitCapabilityRequest(request: import("../vault-core/index.js").AgentSubmitCapabilityRequestCommand): Promise<import("../vault-core/index.js").PendingCapabilityRequestRecord>;
  agentHandleControl(request: VaultAgentControlRequest): Promise<VaultAgentControlResponse | VaultAgentControlErrorResponse>;
  ownerHandleControl(request: VaultOwnerControlRequest): Promise<VaultOwnerControlResponse | VaultOwnerControlErrorResponse>;
}

class LocalVaultService implements VaultService {
  constructor(
    private readonly _authority: VaultCore,
    private readonly _customFlows?: VaultCustomFlowResolver,
    private readonly _clock?: Clock,
    private readonly _fetchImpl: typeof fetch = fetch,
  ) {}

  get vaultId() {
    return this._authority.vaultId;
  }


  ownerOnPendingDispatch(callback: (record: import("../vault-core/index.js").PendingDispatchRecord) => void): () => void {
    return this._authority.ownerOnPendingDispatch(callback);
  }

  ownerOnPendingCapabilityRequest(callback: (record: import("../vault-core/index.js").PendingCapabilityRequestRecord) => void): () => void {
    return this._authority.ownerOnPendingCapabilityRequest(callback);
  }

  ownerRegisterCapability(request: OwnerRegisterCapabilityCommand): Promise<void> {
    return this._authority.ownerRegisterCapability(request);
  }

  ownerRegisterAgentIdentity(request: OwnerRegisterAgentIdentityCommand): Promise<void> {
    return this._authority.ownerRegisterAgentIdentity(request);
  }

  ownerRegisterCustomFlow(request: OwnerRegisterCustomHttpFlowCommand): Promise<void> {
    return this._authority.ownerRegisterCustomFlow(request);
  }

  ownerWriteSecret(request: import("../vault-core/index.js").VaultWriteSecretCommand): Promise<SecretRecord> {
    return this._authority.ownerWriteSecret(request);
  }

  ownerDefineSecretTargets(request: import("../vault-core/index.js").OwnerDefineSecretTargetsCommand): Promise<SecretRecord> {
    return this._authority.ownerDefineSecretTargets(request);
  }

  private redactResponseShape(value: unknown): RedactedResponseShape {
    if (value === null || value === undefined) {
      return null;
    }
    if (Array.isArray(value)) {
      return value.map((entry) => this.redactResponseShape(entry));
    }
    if (typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, this.redactResponseShape(entry)]),
      );
    }
    return null;
  }

  private buildAcquireResponseShape(flow: VaultAcquireSecretFlow, payload: unknown): RedactedResponseShape {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return this.redactResponseShape(payload);
    }
    const record = payload as Record<string, unknown>;
    const response: Record<string, RedactedResponseShape> = {};
    switch (flow) {
      case "oauth_token_response.access_token":
      case "oauth_token_response.refresh_token":
      case "openid_token_response.id_token": {
        if ("token_type" in record) {
          response.token_type = typeof record.token_type === "string" ? record.token_type : null;
        }
        if ("expires_in" in record) {
          response.expires_in = typeof record.expires_in === "number" ? record.expires_in : null;
        }
        if ("scope" in record) {
          response.scope = typeof record.scope === "string" ? record.scope : null;
        }
        break;
      }
    }
    return response;
  }

  private extractSecretForFlow(flow: VaultAcquireSecretFlow, payload: unknown): string {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("VAULT_ACQUISITION_RESPONSE_INVALID");
    }
    const record = payload as Record<string, unknown>;
    switch (flow) {
      case "oauth_token_response.access_token": {
        if (typeof record.access_token !== "string" || !record.access_token) {
          throw new Error("VAULT_ACQUISITION_SECRET_NOT_FOUND");
        }
        return record.access_token;
      }
      case "oauth_token_response.refresh_token": {
        if (typeof record.refresh_token !== "string" || !record.refresh_token) {
          throw new Error("VAULT_ACQUISITION_SECRET_NOT_FOUND");
        }
        return record.refresh_token;
      }
      case "openid_token_response.id_token": {
        if (typeof record.id_token !== "string" || !record.id_token) {
          throw new Error("VAULT_ACQUISITION_SECRET_NOT_FOUND");
        }
        return record.id_token;
      }
    }
  }

  private parseRawResponse(contentType: string | null, rawPayload: string): unknown {
    if (!rawPayload) {
      return null;
    }
    if (contentType?.includes("json")) {
      return JSON.parse(rawPayload);
    }
    try {
      return JSON.parse(rawPayload);
    } catch {
      return rawPayload;
    }
  }

  private async fetchAndParse(request: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<ParsedResponsePayload> {
    const response = await this._fetchImpl(request.url, {
      method: request.method ?? "GET",
      headers: request.headers,
      body: request.body,
    });
    const contentType = response.headers.get("content-type");
    const rawBody = await response.text();
    return {
      contentType,
      rawBody,
      parsedBody: this.parseRawResponse(contentType, rawBody),
      responseStatus: response.status,
    };
  }

  private extractCustomFlowSecret(flow: CustomHttpFlowDefinition, payload: unknown): string | null {
    if (!flow.responseSecret) {
      return null;
    }
    if (flow.responseSecret.kind === "json_field") {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("VAULT_CUSTOM_FLOW_RESPONSE_INVALID");
      }
      const value = (payload as Record<string, unknown>)[flow.responseSecret.field];
      if (typeof value !== "string" || !value) {
        throw new Error("VAULT_CUSTOM_FLOW_SECRET_NOT_FOUND");
      }
      return value;
    }
    return null;
  }

  async acquireSecret(request: VaultAcquireSecretInput): Promise<VaultAcquireSecretResult> {
    const standardBoundary = createStandardAcquireBoundary({
      targetUrl: request.url,
      method: request.method,
      responseField: request.flow === "oauth_token_response.access_token"
        ? "access_token"
        : request.flow === "oauth_token_response.refresh_token"
          ? "refresh_token"
          : "id_token",
      storeAlias: request.alias,
    });
    const payload = await this.fetchAndParse(request);
    const targetBindings: readonly VaultTargetBinding[] = [{
      kind: "site",
      targetId: request.issuerId,
      targetUrl: standardBoundary.targetUrl,
      methods: [standardBoundary.method],
      paths: [new URL(standardBoundary.targetUrl).pathname || "/"],
    }];

    await this._authority.ownerWriteSecret({
      kind: "issuer.write_secret",
      vaultId: this._authority.vaultId,
      issuer: {
        kind: "trusted_issuer",
        id: request.issuerId,
      },
      alias: request.alias,
      plaintext: this.extractSecretForFlow(request.flow, payload.parsedBody),
      issuerSiteId: request.issuerId,
      targetBindings,
      requestedAt: request.requestedAt ?? (this._clock?.nowIso() ?? new Date().toISOString()),
    });
    return {
      vaultId: this._authority.vaultId,
      alias: request.alias,
      status: "stored",
      responseStatus: payload.responseStatus,
      contentType: payload.contentType,
      responseShape: this.buildAcquireResponseShape(request.flow, payload.parsedBody),
    };
  }

  agentDispatch(request: DispatchRequest): Promise<DispatchResult> {
    return this._authority.agentDispatchSecret(request);
  }

  async agentHandleDispatch(
    request: VaultAgentDispatchRequest,
  ): Promise<VaultAgentDispatchResponse | VaultAgentDispatchErrorResponse> {
    try {
      const vaultId = { value: request.vaultId };
      const capability = await this.resolveCapability(vaultId, request.agentId, request.capabilityId);
      const customFlow = capability?.operation === "custom_http"
        ? await this.resolveCustomFlow(vaultId, capability.customFlowId)
        : null;
      const boundary = customFlow
        ? toOwnerHttpFlowBoundary(customFlow)
        : createOwnerHttpFlowBoundary({
          mode: "send_secret",
          targetUrl: request.targetUrl,
          method: request.method,
          responseVisibility: "passthrough",
        });
      if (customFlow) {
        if (request.targetUrl !== boundary.targetUrl || request.method.toUpperCase() !== boundary.method.toUpperCase()) {
          throw new Error("VAULT_CUSTOM_FLOW_BINDING_MISMATCH");
        }
      }
      if (boundary.mode === "acquire_secret") {
        if (!customFlow) {
          throw new Error("VAULT_CUSTOM_FLOW_NOT_FOUND");
        }
        const authorization = await this._authority.agentAuthorizeDispatch({
          vaultId,
          requestId: request.requestId,
          requestedAt: request.requestedAt,
          agent: {
            kind: "agent",
            id: request.agentId,
          },
          capability,
          proof: {
            agentId: request.agentId,
            signature: request.proof.signature,
            token: request.proof.token,
            requestId: request.requestId,
            requestedAt: request.requestedAt,
          },
          secretAlias: undefined,
          targetUrl: request.targetUrl,
          method: request.method,
          headers: request.headers,
          body: request.body,
        });
        if (authorization.decision !== "allow") {
          throw new Error("VAULT_CUSTOM_FLOW_DENIED");
        }
        const payload = await this.fetchAndParse({
          url: request.targetUrl,
          method: request.method,
          headers: request.headers,
          body: request.body,
        });
        const acquiredSecret = this.extractCustomFlowSecret(customFlow, payload.parsedBody);
        if (!acquiredSecret || !customFlow.responseSecret) {
          throw new Error("VAULT_CUSTOM_FLOW_SECRET_NOT_FOUND");
        }
        await this._authority._storeCustomFlowSecret(customFlow, customFlow.responseSecret.storeAlias, acquiredSecret);
        return {
          ok: true,
          result: {
            vaultId,
            requestId: request.requestId,
            status: DispatchStatus.SUCCEEDED,
            targetUrl: request.targetUrl,
            method: request.method,
            responseStatus: payload.responseStatus,
            responseBody: boundary.responseVisibility === "shape_only"
              ? JSON.stringify(this.redactResponseShape(payload.parsedBody))
              : payload.rawBody,
          },
        };
      }

      const result = await this._authority.agentDispatchSecret({
        vaultId,
        requestId: request.requestId,
        requestedAt: request.requestedAt,
        agent: {
          kind: "agent",
          id: request.agentId,
        },
        capability,
        proof: {
          agentId: request.agentId,
          signature: request.proof.signature,
          token: request.proof.token,
          requestId: request.requestId,
          requestedAt: request.requestedAt,
        },
        secretAlias: request.secretAlias,
        targetUrl: request.targetUrl,
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      if (boundary.mode === "bidirectional_secret") {
        if (!customFlow) {
          throw new Error("VAULT_CUSTOM_FLOW_NOT_FOUND");
        }
        const parsedBody = this.parseBody(result.responseBody);
        const acquiredSecret = this.extractCustomFlowSecret(customFlow, parsedBody);
        if (!acquiredSecret || !customFlow.responseSecret) {
          throw new Error("VAULT_CUSTOM_FLOW_SECRET_NOT_FOUND");
        }
        await this._authority._storeCustomFlowSecret(customFlow, customFlow.responseSecret.storeAlias, acquiredSecret);
      }
      return {
        ok: true,
        result: boundary.responseVisibility === "shape_only"
          ? {
            ...result,
            responseBody: JSON.stringify(this.redactResponseShape(this.parseBody(result.responseBody))),
          }
          : result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = error instanceof Error && "code" in error && typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "VAULT_AGENT_DISPATCH_REJECTED";
      return {
        ok: false,
        error: { code, message },
      };
    }
  }

  ownerReadAudit(request: OwnerAuditRequest): Promise<readonly import("../vault-core/index.js").AuditEntry[]> {
    return this._authority.ownerReadAudit(request.actor, request.query, {
      requestId: request.requestId,
      requestedAt: request.requestedAt,
    });
  }

  ownerExportSecret(request: OwnerExportSecretRequest): Promise<OwnerSecretExport> {
    return this._authority.ownerExportSecret(request.actor, request.alias, {
      requestId: request.requestId,
      requestedAt: request.requestedAt,
    });
  }

  ownerDeleteSecret(request: import("../vault-core/index.js").OwnerDeleteSecretCommand): Promise<void> {
    return this._authority.ownerDeleteSecret(request);
  }

  async ownerListAgents(request: OwnerListAgentsRequest): Promise<readonly AgentIdentityRecord[]> {
    return await this._authority.ownerListAgents(request.actor, request);
  }

  async ownerListCapabilities(request: OwnerListCapabilitiesRequest): Promise<readonly AgentCapability[]> {
    return await this._authority.ownerListCapabilities(request.actor, request.agentId, request);
  }

  async ownerListSecrets(request: { vaultId: VaultId; owner: VaultPrincipal; requestId?: string }): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]> {
    return await this._authority.ownerListSecrets(request.owner as VaultPrincipal & { kind: "owner" }, request);
  }

  async ownerRevokeCapability(command: OwnerRevokeCapabilityCommand): Promise<void> {
    return await this._authority.ownerRevokeCapability(command);
  }

  async ownerIssueSessionToken(request: import("../vault-core/index.js").OwnerIssueSessionTokenRequest): Promise<import("../vault-core/index.js").OwnerSessionToken> {
    return await this._authority.ownerIssueSessionToken(request);
  }

  async ownerIssueAllAgentSessionTokens(request: { vaultId: VaultId; actor: VaultPrincipal & { kind: "owner" } }): Promise<import("../vault-core/index.js").OwnerSessionToken[]> {
    return await this._authority.ownerIssueAllAgentSessionTokens(request.actor);
  }

  async ownerRevokeSessionToken(request: { vaultId: VaultId; actor: VaultPrincipal & { kind: "owner" }; token: string }): Promise<void> {
    return this._authority.ownerRevokeSessionToken(request);
  }

  ownerSubmitCapabilityRequest(request: import("../vault-core/index.js").SubmitCapabilityRequestCommand): Promise<import("../vault-core/index.js").PendingCapabilityRequestRecord> {
    return this._authority.ownerSubmitCapabilityRequest(request);
  }

  ownerListPendingCapabilityRequests(request: { vaultId: VaultId; owner: VaultPrincipal }): Promise<readonly import("../vault-core/index.js").PendingCapabilityRequestRecord[]> {
    return this._authority.ownerListPendingCapabilityRequests(request);
  }

  ownerApproveCapabilityRequest(request: import("../vault-core/index.js").OwnerApproveCapabilityRequestCommand): Promise<AgentCapability> {
    return this._authority.ownerApproveCapabilityRequest(request);
  }

  ownerRejectCapabilityRequest(request: import("../vault-core/index.js").OwnerRejectCapabilityRequestCommand): Promise<void> {
    return this._authority.ownerRejectCapabilityRequest(request);
  }

  ownerListPendingDispatches(request: { vaultId: VaultId; owner: VaultPrincipal }): Promise<readonly import("../vault-core/index.js").PendingDispatchRecord[]> {
    return this._authority.ownerListPendingDispatches(request);
  }

  ownerApproveDispatch(request: import("../vault-core/index.js").OwnerApproveDispatchCommand): Promise<DispatchResult> {
    return this._authority.ownerApproveDispatch(request);
  }

  ownerRejectDispatch(request: import("../vault-core/index.js").OwnerRejectDispatchCommand): Promise<void> {
    return this._authority.ownerRejectDispatch(request);
  }

  agentListCapabilities(request: import("../vault-core/index.js").AgentListCapabilitiesRequest): Promise<readonly AgentCapability[]> {
    return this._authority.agentListCapabilities(request);
  }

  agentListSecrets(request: import("../vault-core/index.js").AgentListSecretsRequest): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]> {
    return this._authority.agentListSecrets(request);
  }

  agentSubmitCapabilityRequest(request: import("../vault-core/index.js").AgentSubmitCapabilityRequestCommand): Promise<import("../vault-core/index.js").PendingCapabilityRequestRecord> {
    return this._authority.agentSubmitCapabilityRequest(request);
  }

  async agentHandleControl(request: VaultAgentControlRequest): Promise<VaultAgentControlResponse | VaultAgentControlErrorResponse> {
    try {
      const base = {
        vaultId: { value: request.vaultId },
        requestId: request.requestId,
        requestedAt: request.requestedAt,
        agent: { kind: "agent" as const, id: request.agentId },
        proof: {
          agentId: request.agentId,
          signature: request.proof.signature,
          token: request.proof.token,
          requestId: request.requestId,
          requestedAt: request.requestedAt,
        },
      };
      switch (request.action) {
        case "list_capabilities":
          return { ok: true, result: await this.agentListCapabilities(base) };
        case "list_secrets":
          return { ok: true, result: await this.agentListSecrets(base) };
        case "submit_capability_request":
          return {
            ok: true,
            result: await this.agentSubmitCapabilityRequest({
              ...base,
              scope: {
                operation: request.operation ?? "dispatch_http",
                secretAliases: request.secretAliases ?? [],
                scope: request.scope,
                methods: request.methods,
              },
              justification: request.justification,
            }),
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = error instanceof Error && "code" in error && typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "VAULT_AGENT_CONTROL_REJECTED";
      return { ok: false, error: { code, message } };
    }
  }

  async ownerHandleControl(request: VaultOwnerControlRequest): Promise<VaultOwnerControlResponse | VaultOwnerControlErrorResponse> {
    const owner = { kind: "owner" as const, id: request.ownerId ?? "vault-master" };
    const vaultId = { value: request.vaultId };
    try {
      switch (request.action) {
        case "list_pending_dispatches":
          return { ok: true, result: await this.ownerListPendingDispatches({ vaultId, owner }) };
        case "approve_dispatch":
          return { ok: true, result: await this.ownerApproveDispatch({ vaultId, requestId: request.requestId, owner, permanent: request.permanent, skipAudit: request.skipAudit }) };
        case "reject_dispatch":
          return { ok: true, result: await this.ownerRejectDispatch({ vaultId, requestId: request.requestId, owner }) };
        case "list_pending_capability_requests":
          return { ok: true, result: await this.ownerListPendingCapabilityRequests({ vaultId, owner }) };
        case "approve_capability_request":
          return { ok: true, result: await this.ownerApproveCapabilityRequest({ vaultId, requestId: request.requestId, owner, capabilityId: request.capabilityId }) };
        case "reject_capability_request":
          return { ok: true, result: await this.ownerRejectCapabilityRequest({ vaultId, requestId: request.requestId, owner }) };
        case "list_agents":
          return { ok: true, result: await this.ownerListAgents({ vaultId, actor: owner, requestId: `owner:list_agents:${Date.now()}`, requestedAt: this._clock?.nowIso?.() ?? new Date().toISOString() }) };
        case "list_capabilities":
          return { ok: true, result: await this.ownerListCapabilities({ vaultId, actor: owner, agentId: request.agentId, requestId: `owner:list_capabilities:${Date.now()}`, requestedAt: this._clock?.nowIso?.() ?? new Date().toISOString() }) };
        case "list_secrets":
          return { ok: true, result: await this.ownerListSecrets({ vaultId, owner, requestId: `owner:list_secrets:${Date.now()}` }) };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = error instanceof Error && "code" in error && typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "VAULT_OWNER_CONTROL_REJECTED";
      return { ok: false, error: { code, message } };
    }
  }

  private async resolveCapability(vaultId: VaultId, agentId: string, capabilityId?: string): Promise<AgentCapability | undefined> {
    if (!capabilityId) {
      return undefined;
    }
    const capability = await this._authority._getCapability(vaultId, agentId, capabilityId);
    return capability ?? undefined;
  }

  private parseBody(body: string | undefined): unknown {
    if (!body) {
      return null;
    }
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  private async resolveCustomFlow(vaultId: VaultId, flowId: string | undefined): Promise<CustomHttpFlowDefinition> {
    if (!flowId) {
      throw new Error("VAULT_CUSTOM_FLOW_NOT_PROVIDED");
    }
    if (!this._customFlows) {
      throw new Error("VAULT_CUSTOM_FLOW_RESOLVER_NOT_CONFIGURED");
    }
    const flow = await this._customFlows.get(vaultId, flowId);
    if (!flow) {
      throw new Error("VAULT_CUSTOM_FLOW_NOT_FOUND");
    }
    return flow;
  }
}

export function createVaultService(
  deps: VaultCoreDependencies,
  options: {
    customFlows?: VaultCustomFlowResolver;
    clock?: Clock;
    fetchImpl?: typeof fetch;
  } = {},
): VaultService {
  return new LocalVaultService(createVaultCore(deps), options.customFlows ?? deps.customFlows, options.clock, options.fetchImpl);
}

export function wrapVaultCoreAsVaultService(
  core: VaultCore,
  options: {
    customFlows?: VaultCustomFlowResolver;
    clock?: Clock;
    fetchImpl?: typeof fetch;
  } = {},
): VaultService {
  return new LocalVaultService(core, options.customFlows, options.clock, options.fetchImpl);
}

export type { OwnerHttpFlowBoundary } from "./flow-factories.js";
export {
  createOwnerHttpFlowBoundary,
  createStandardAcquireBoundary,
  createStandardDispatchBoundary,
  toOwnerHttpFlowBoundary,
} from "./flow-factories.js";

export { AgentDispatchHttpTransport } from "./remote-transport.js";
export { handleVaultHttpDispatch, handleVaultAgentControlHttp } from "./server-utils.js";
/*
 * Owner remote control export is intentionally disabled until it has a real
 * authentication story. Restore the export below when that work is done.
 *
 * export { handleVaultOwnerControlHttp } from "./server-utils.js";
 */
