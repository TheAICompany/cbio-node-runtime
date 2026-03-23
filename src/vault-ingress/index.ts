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
  type OwnerRegisterAgentIdentityCommand,
  type OwnerRegisterCustomHttpFlowCommand,
  type CustomHttpFlowDefinition,
  type OwnerIdentityRecord,
  type OwnerSecretExport,
  type SecretRecord,
  type VaultId,
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
  capabilityId: string;
  secretAlias?: string;
  targetUrl: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  proof: { signature: string };
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

export interface VaultCustomFlowResolver {
  get(vaultId: VaultId, flowId: string): Promise<CustomHttpFlowDefinition | null>;
}

export interface VaultService {
  readonly vaultId: VaultCore["vaultId"];
  bootstrapOwnerIdentity(request: OwnerIdentityRecord): Promise<void>;
  registerCapability(request: OwnerRegisterCapabilityCommand): Promise<void>;
  registerAgentIdentity(request: OwnerRegisterAgentIdentityCommand): Promise<void>;
  registerCustomFlow(request: OwnerRegisterCustomHttpFlowCommand): Promise<void>;
  writeSecret(request: import("../vault-core/index.js").VaultWriteSecretCommand): Promise<SecretRecord>;
  defineSecretTargets(request: import("../vault-core/index.js").OwnerDefineSecretTargetsCommand): Promise<SecretRecord>;
  acquireSecret(request: VaultAcquireSecretInput): Promise<VaultAcquireSecretResult>;
  dispatch(request: DispatchRequest): Promise<DispatchResult>;
  handleAgentDispatch(request: VaultAgentDispatchRequest): Promise<VaultAgentDispatchResponse | VaultAgentDispatchErrorResponse>;
  readAudit(request: OwnerAuditRequest): Promise<readonly import("../vault-core/index.js").AuditEntry[]>;
  exportSecret(request: OwnerExportSecretRequest): Promise<OwnerSecretExport>;
  deleteSecret(request: import("../vault-core/index.js").OwnerDeleteSecretCommand): Promise<void>;
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

  bootstrapOwnerIdentity(request: OwnerIdentityRecord): Promise<void> {
    return this._authority.bootstrapOwnerIdentity(request);
  }

  registerCapability(request: OwnerRegisterCapabilityCommand): Promise<void> {
    return this._authority.registerCapability(request);
  }

  registerAgentIdentity(request: OwnerRegisterAgentIdentityCommand): Promise<void> {
    return this._authority.registerAgentIdentity(request);
  }

  registerCustomFlow(request: OwnerRegisterCustomHttpFlowCommand): Promise<void> {
    return this._authority.registerCustomFlow(request);
  }

  writeSecret(request: import("../vault-core/index.js").VaultWriteSecretCommand): Promise<SecretRecord> {
    return this._authority.writeSecret(request);
  }

  defineSecretTargets(request: import("../vault-core/index.js").OwnerDefineSecretTargetsCommand): Promise<SecretRecord> {
    return this._authority.defineSecretTargets(request);
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

    await this._authority.writeSecret({
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

  dispatch(request: DispatchRequest): Promise<DispatchResult> {
    return this._authority.dispatchSecret(request);
  }

  async handleAgentDispatch(
    request: VaultAgentDispatchRequest,
  ): Promise<VaultAgentDispatchResponse | VaultAgentDispatchErrorResponse> {
    try {
      const vaultId = { value: request.vaultId };
      const capability = await this.resolveCapability(vaultId, request.agentId, request.capabilityId);
      const customFlow = capability.operation === "custom_http"
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
        const authorization = await this._authority.authorizeDispatch({
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
        await this._authority.storeCustomFlowSecret(customFlow, customFlow.responseSecret.storeAlias, acquiredSecret);
        return {
          ok: true,
          result: {
            vaultId,
            requestId: request.requestId,
            status: "succeeded",
            targetUrl: request.targetUrl,
            method: request.method,
            responseStatus: payload.responseStatus,
            responseBody: boundary.responseVisibility === "shape_only"
              ? JSON.stringify(this.redactResponseShape(payload.parsedBody))
              : payload.rawBody,
          },
        };
      }

      const result = await this._authority.dispatchSecret({
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
        await this._authority.storeCustomFlowSecret(customFlow, customFlow.responseSecret.storeAlias, acquiredSecret);
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

  readAudit(request: OwnerAuditRequest): Promise<readonly import("../vault-core/index.js").AuditEntry[]> {
    return this._authority.getAudit(request.actor, request.query, {
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      proof: request.proof,
    });
  }

  exportSecret(request: OwnerExportSecretRequest): Promise<OwnerSecretExport> {
    return this._authority.exportSecret(request.actor, request.alias, {
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      proof: request.proof,
    });
  }

  deleteSecret(request: import("../vault-core/index.js").OwnerDeleteSecretCommand): Promise<void> {
    return this._authority.deleteSecret(request);
  }

  private async resolveCapability(vaultId: VaultId, agentId: string, capabilityId: string): Promise<AgentCapability> {
    const capability = await this._authority.getCapability(vaultId, agentId, capabilityId);
    if (!capability) {
      throw new Error("VAULT_CAPABILITY_NOT_FOUND");
    }
    return capability;
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
