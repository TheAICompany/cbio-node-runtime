import type { AgentDispatchTransport } from "../clients/agent/index.js";
import type { VaultService } from "./index.js";

/**
 * @internal
 */
export class LocalVaultTransport implements AgentDispatchTransport {
  constructor(private readonly _vault: VaultService) {}

  async agentDispatch(
    request: import("../vault-core/index.js").DispatchRequest,
  ): Promise<import("../vault-core/index.js").DispatchResult> {
    const response = await this._vault.agentHandleDispatch({
      vault_id: request.vault_id,
      request_id: request.request_id,
      requested_at: request.requested_at,
      root_agent_id: request.agent.id,
      reason: request.reason,
      secret_id: request.secret_id,
      target_url: request.target_url,
      method: request.method,
      headers: request.headers,
      body: request.body,
      proof: { token: request.proof.token, signature: request.proof.signature },
    });
    if (!response.ok) {
      throw new Error(`${response.error.code}:${response.error.message}`);
    }
    return response.result;
  }

  async agentListGrants(request: import("../vault-core/index.js").AgentListGrantsRequest) {
    const response = await this._vault.agentHandleControl({
      action: "get_manifest",
      vault_id: request.vault_id,
      request_id: request.request_id,
      requested_at: request.requested_at,
      root_agent_id: request.agent.id,
      proof: { token: request.proof.token, signature: request.proof.signature },
    });
    if (!response.ok) throw new Error(`${response.error.code}:${response.error.message}`);
    return (response.result as import("../vault-core/index.js").AgentRuntimeManifest).grants;
  }

  async agentListSecrets(request: import("../vault-core/index.js").AgentListSecretsRequest) {
    return this._vault.agentListSecrets(request);
  }

  async agentListRequests(request: import("../vault-core/index.js").AgentListRequestsRequest) {
    return this._vault.agentListRequests(request);
  }

  async agentGetRequest(request: import("../vault-core/index.js").AgentGetRequestRequest) {
    return this._vault.agentGetRequest(request);
  }

  async agentGetRuntimeManifest(request: import("../vault-core/index.js").AgentGetRuntimeManifestRequest) {
    return this._vault.agentGetRuntimeManifest(request);
  }

  async agentAuditTestPing(request: import("../vault-core/index.js").AgentAuditTestPingRequest) {
    return this._vault.agentAuditTestPing(request);
  }
}
