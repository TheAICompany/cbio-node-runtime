import type {
  VaultService,
  VaultAgentDispatchRequest,
  VaultAgentDispatchResponse,
  VaultAgentDispatchErrorResponse,
  VaultAgentControlRequest,
  VaultAgentControlResponse,
  VaultAgentControlErrorResponse,
} from "./index.js";

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
  const request = body as Partial<VaultAgentDispatchRequest>;
  if (!request.proof?.token) {
    return {
      ok: false,
      error: { code: "VAULT_REMOTE_TOKEN_REQUIRED", message: "Remote agent dispatch requires a session token" },
    };
  }
  return service.agentHandleDispatch(request as VaultAgentDispatchRequest);
}

export async function handleVaultAgentControlHttp(
  service: VaultService,
  body: unknown,
): Promise<VaultAgentControlResponse | VaultAgentControlErrorResponse> {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: { code: "VAULT_INVALID_REQUEST_BODY", message: "Request body must be a JSON object" },
    };
  }
  const request = body as Partial<VaultAgentControlRequest>;
  if (!request.proof?.token) {
    return {
      ok: false,
      error: { code: "VAULT_REMOTE_TOKEN_REQUIRED", message: "Remote agent control requires a session token" },
    };
  }
  return service.agentHandleControl(request as VaultAgentControlRequest);
}

/*
 * Owner remote control is intentionally disabled for now.
 * The original wiring is kept here as a commented stub so it can be restored
 * after owner-side remote authentication is designed and implemented.
 *
 * export async function handleVaultOwnerControlHttp(
 *   service: VaultService,
 *   body: unknown,
 * ): Promise<VaultOwnerControlResponse | VaultOwnerControlErrorResponse> {
 *   if (!body || typeof body !== "object") {
 *     return {
 *       ok: false,
 *       error: { code: "VAULT_INVALID_REQUEST_BODY", message: "Request body must be a JSON object" },
 *     };
 *   }
 *   return service.ownerHandleControl(body as VaultOwnerControlRequest);
 * }
 */
