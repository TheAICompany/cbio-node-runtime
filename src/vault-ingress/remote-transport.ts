import type { AgentDispatchTransport } from "../clients/agent/contracts.js";
import type { DispatchRequest, DispatchResult } from "../vault-core/contracts.js";
import type { VaultAgentDispatchRequest, VaultAgentDispatchResponse, VaultAgentDispatchErrorResponse } from "./index.js";

/**
 * Remote transport for AgentClient that communicates over HTTP.
 * This allows the Agent (LLM) to reside in a separate process from the Vault Core.
 */
export class AgentDispatchHttpTransport implements AgentDispatchTransport {
  constructor(
    private readonly _url: string,
    private readonly _fetchImpl: typeof fetch = fetch,
  ) {}

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    const remoteRequest: VaultAgentDispatchRequest = {
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
}
