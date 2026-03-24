import type { AgentDispatchTransport } from "../clients/agent/index.js";
import type { VaultService } from "./index.js";

/**
 * @internal
 */
export class LocalVaultTransport implements AgentDispatchTransport {
  constructor(private readonly _vault: VaultService) {}

  async dispatch(
    request: import("../vault-core/index.js").DispatchRequest,
  ): Promise<import("../vault-core/index.js").DispatchResult> {
    const response = await this._vault.handleAgentDispatch({
      vaultId: request.vaultId.value,
      requestId: request.requestId,
      requestedAt: request.requestedAt,
      agentId: request.agent.id,
      capabilityId: request.capability.capabilityId,
      secretAlias: request.secretAlias,
      targetUrl: request.targetUrl,
      method: request.method,
      headers: request.headers,
      body: request.body,
      proof: { signature: request.proof.signature },
    });
    if (!response.ok) {
      throw new Error(`${response.error.code}:${response.error.message}`);
    }
    return response.result;
  }
}
