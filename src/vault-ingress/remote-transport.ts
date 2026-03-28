import type { AgentDispatchTransport } from "../clients/agent/contracts.js";
import type { DispatchRequest, DispatchResult, AgentSecretGrant, SecretDestinationGrant } from "../vault-core/contracts.js";
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
      vault_id: request.vault_id.value,
      request_id: request.request_id,
      requested_at: request.requested_at,
      root_agent_id: request.agent.id,
      reason: request.reason,
      secret_alias: request.secret_alias,
      target_url: request.target_url,
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

  async agentListGrants(request: import("../vault-core/index.js").AgentListGrantsRequest): Promise<{ agent_secrets: readonly AgentSecretGrant[], secret_destinations: readonly SecretDestinationGrant[] }> {
    const payload = await this._postControl({
      action: "list_grants",
      vault_id: request.vault_id.value,
      request_id: request.request_id,
      requested_at: request.requested_at,
      root_agent_id: request.agent.id,
      proof: { token: request.proof.token },
    });
    return payload as { agent_secrets: readonly AgentSecretGrant[], secret_destinations: readonly SecretDestinationGrant[] };
  }

  async agentListSecrets(request: import("../vault-core/index.js").AgentListSecretsRequest): Promise<readonly import("../vault-core/index.js").AgentVisibleSecretRecord[]> {
    const payload = await this._postControl({
      action: "list_secrets",
      vault_id: request.vault_id.value,
      request_id: request.request_id,
      requested_at: request.requested_at,
      root_agent_id: request.agent.id,
      proof: { token: request.proof.token },
    });
    return payload as readonly import("../vault-core/index.js").AgentVisibleSecretRecord[];
  }

  async agentListRequests(request: import("../vault-core/index.js").AgentListRequestsRequest): Promise<readonly import("../vault-core/index.js").AgentVisibleRequestRecord[]> {
    const payload = await this._postControl({
      action: "list_requests",
      vault_id: request.vault_id.value,
      request_id: request.request_id,
      requested_at: request.requested_at,
      root_agent_id: request.agent.id,
      proof: { token: request.proof.token },
    });
    return payload as readonly import("../vault-core/index.js").AgentVisibleRequestRecord[];
  }

  async agentGetRequest(request: import("../vault-core/index.js").AgentGetRequestRequest): Promise<import("../vault-core/index.js").AgentRequestResult> {
    const payload = await this._postControl({
      action: "read_request_result",
      vault_id: request.vault_id.value,
      request_id: request.request_id,
      requested_at: request.requested_at,
      target_request_id: request.target_request_id,
      root_agent_id: request.agent.id,
      proof: { token: request.proof.token },
    });
    return payload as import("../vault-core/index.js").AgentRequestResult;
  }

  async agentGetRuntimeManifest(request: import("../vault-core/index.js").AgentGetRuntimeManifestRequest): Promise<import("../vault-core/index.js").AgentRuntimeManifest> {
    const payload = await this._postControl({
      action: "get_manifest",
      vault_id: request.vault_id.value,
      request_id: request.request_id,
      requested_at: request.requested_at,
      root_agent_id: request.agent.id,
      proof: { token: request.proof.token },
    });
    return payload as import("../vault-core/index.js").AgentRuntimeManifest;
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
