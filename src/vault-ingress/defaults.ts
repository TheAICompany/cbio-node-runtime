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
      vaultId: request.vaultId.value,
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      rootAgentId: request.agent.id,
      reason: request.reason,
      secretAlias: request.secretAlias,
      targetUrl: request.targetUrl,
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
      vaultId: request.vaultId.value,
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      rootAgentId: request.agent.id,
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
}
