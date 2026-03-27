import type { AgentDispatchTransport } from "../clients/agent/contracts.js";
import type { DispatchRequest, DispatchResult } from "../vault-core/contracts.js";
import type { VaultAgentDispatchRequest, VaultAgentDispatchResponse, VaultAgentDispatchErrorResponse } from "./index.js";

/**
 * Remote transport for AgentClient that communicates over HTTP.
 * This allows the Agent (LLM) to reside in a separate process from the Vault Core.
 */
/**
 * @internal
 */
export class AgentDispatchHttpTransport implements AgentDispatchTransport {
  constructor(
    private readonly _url: string,
    private readonly _fetchImpl: typeof fetch = fetch,
    private readonly _controlUrl: string = new URL("./agent/control", _url).toString(),
  ) {}

  async agentDispatch(request: DispatchRequest): Promise<DispatchResult> {
    const remoteRequest: VaultAgentDispatchRequest = {
      vaultId: request.vaultId.value,
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      agentId: request.agent.id,
      capabilityId: request.capability?.capabilityId,
      secretAlias: request.secretAlias,
      targetUrl: request.targetUrl,
      method: request.method,
      headers: request.headers,
      body: request.body,
      proof: { 
        token: request.proof.token,
      },
    };

    const response = await this._fetchImpl(this._url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(remoteRequest),
    });

    if (!response.ok) {
      throw new Error(`VAULT_REMOTE_TRANSPORT_HTTP_ERROR: ${response.status} ${response.statusText}`);
    }

    const payload: VaultAgentDispatchResponse | VaultAgentDispatchErrorResponse = await response.json();
    if (!payload.ok) {
      const error = new Error(`${payload.error.code}: ${payload.error.message}`);
      (error as any).code = payload.error.code;
      throw error;
    }

    return payload.result;
  }

  async agentListCapabilities(request: import("../vault-core/index.js").AgentListCapabilitiesRequest): Promise<readonly import("../vault-core/index.js").AgentCapabilityState[]> {
    const payload = await this._postControl({
      action: "list_capabilities",
      vaultId: request.vaultId.value,
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      agentId: request.agent.id,
      proof: { token: request.proof.token },
    });
    return payload as readonly import("../vault-core/index.js").AgentCapabilityState[];
  }

  async agentListSecrets(request: import("../vault-core/index.js").AgentListSecretsRequest): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]> {
    const payload = await this._postControl({
      action: "list_secrets",
      vaultId: request.vaultId.value,
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      agentId: request.agent.id,
      proof: { token: request.proof.token },
    });
    return payload as readonly import("../vault-core/index.js").AgentVisibleSecretRecord[];
  }

  async agentListRequests(request: import("../vault-core/index.js").AgentListRequestsRequest): Promise<readonly import("../vault-core/index.js").AgentVisibleRequestRecord[]> {
    const payload = await this._postControl({
      action: "list_requests",
      vaultId: request.vaultId.value,
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      agentId: request.agent.id,
      proof: { token: request.proof.token },
    });
    return payload as readonly import("../vault-core/index.js").AgentVisibleRequestRecord[];
  }

  async agentGetRequest(request: import("../vault-core/index.js").AgentGetRequestRequest): Promise<import("../vault-core/index.js").AgentRequestResult> {
    const payload = await this._postControl({
      action: "read_request_result",
      vaultId: request.vaultId.value,
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      targetRequestId: request.targetRequestId,
      agentId: request.agent.id,
      proof: { token: request.proof.token },
    });
    return payload as import("../vault-core/index.js").AgentRequestResult;
  }

  async agentGetRuntimeManifest(request: import("../vault-core/index.js").AgentGetRuntimeManifestRequest): Promise<import("../vault-core/index.js").AgentRuntimeManifest> {
    const payload = await this._postControl({
      action: "get_manifest",
      vaultId: request.vaultId.value,
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      agentId: request.agent.id,
      proof: { token: request.proof.token },
    });
    return payload as import("../vault-core/index.js").AgentRuntimeManifest;
  }

  async agentSubmitCapabilityRequest(request: import("../vault-core/index.js").AgentSubmitCapabilityRequestCommand): Promise<import("../vault-core/index.js").CapabilityStateRecord> {
    const payload = await this._postControl({
      action: "submit_capability_request",
      vaultId: request.vaultId.value,
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      agentId: request.agent.id,
      proof: { token: request.proof.token },
      operation: request.capability.operation,
      secretAliases: request.secretAliases ? [...request.secretAliases] : [],
      write: {
        scope: request.capability.write.scope,
        methods: [...request.capability.write.methods],
      },
      read: {
        mode: request.capability.read.mode,
        paths: request.capability.read.paths ? [...request.capability.read.paths] : undefined,
      },
      justification: request.justification,
    });
    return payload as import("../vault-core/index.js").CapabilityStateRecord;
  }

  private async _postControl(body: unknown): Promise<unknown> {
    const response = await this._fetchImpl(this._controlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`VAULT_REMOTE_TRANSPORT_HTTP_ERROR: ${response.status} ${response.statusText}`);
    }
    const payload: import("./index.js").VaultAgentControlResponse | import("./index.js").VaultAgentControlErrorResponse = await response.json();
    if (!payload.ok) {
      const error = new Error(`${payload.error.code}: ${payload.error.message}`);
      (error as any).code = payload.error.code;
      throw error;
    }
    return payload.result;
  }
}
