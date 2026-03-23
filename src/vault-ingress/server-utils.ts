import type { VaultService, VaultAgentDispatchRequest, VaultAgentDispatchResponse, VaultAgentDispatchErrorResponse } from "./index.js";

/**
 * Standard server-side helper to handle a vault agent dispatch request from an HTTP body.
 * This can be used in any HTTP server framework (Express, Fastify, etc.).
 * 
 * @param service The VaultService instance to handle the request.
 * @param body The parsed JSON body of the incoming HTTP request.
 * @returns A JSON-serializable response object.
 */
export async function handleVaultHttpDispatch(
  service: VaultService,
  body: unknown,
): Promise<VaultAgentDispatchResponse | VaultAgentDispatchErrorResponse> {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: { code: "VAULT_INVALID_REQUEST_BODY", message: "Request body must be a JSON object" },
    };
  }
  return service.handleAgentDispatch(body as VaultAgentDispatchRequest);
}
