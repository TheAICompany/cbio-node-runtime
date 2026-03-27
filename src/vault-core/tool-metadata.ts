import type { VaultToolDefinition } from "./contracts.js";

export const AGENT_TOOL_METADATA: Record<string, { description: string; parameters: Record<string, any> }> = {
  agentIntrospect: {
    description: "Get a manifest of your identity, capabilities, and all available tools. This is your '--help' and 'llms.txt'. Important boundary: agents can use secrets and request more access, but they do not directly create, update, or remove vault secrets. If you obtain a new API key, JWT, refresh token, or similar credential during a website registration or login flow, it is not automatically stored just because you saw it. New secret material is stored only when the owner performs a secret lifecycle action or when an owner-configured vault acquisition/custom flow captures and stores the response for you.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  agentDispatch: {
    description: "Execute a real outbound request with a vault-managed secret. Use this when you already have a vault secret and permission to use it against a target URL. You must provide a one-sentence justification for the owner explaining why this request should be sent. This tool does not create or store new secrets in the vault. If write permission is missing, the request will not be sent and a pending approval carrier will be created instead.",
    parameters: {
      type: "object",
      properties: {
        secretAlias: { type: "string", description: "The human-readable secret name to use." },
        targetUrl: { type: "string", description: "The destination URL for the outbound request." },
        method: { type: "string", description: "The HTTP method (e.g., POST, GET)." },
        justification: { type: "string", description: "Required. One concise sentence for the owner explaining why this exact request should be sent." },
        body: { type: "string", description: "Optional request body." },
        headers: { type: "object", description: "Optional request headers." },
      },
      required: ["secretAlias", "targetUrl", "method", "justification"],
    },
  },
  agentListCapabilities: {
    description: "List all capabilities explicitly granted to you by the owner.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  agentListSecrets: {
    description: "List secrets currently active in the vault, including metadata about whether you are authorized to use each one. This is a discovery/introspection tool only. It does not create, update, remove, or automatically persist newly obtained credentials.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  agentListRequests: {
    description: "List your request history with partially redacted metadata. Results remain hidden until the read action is approved.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  agentGetRequest: {
    description: "Get one executed request record. The result payload is returned only after the owner approves the read action for that request.",
    parameters: {
      type: "object",
      properties: {
        requestId: { type: "string", description: "The request identifier returned when the request was executed." },
      },
      required: ["requestId"],
    },
  },
  agentSubmitCapabilityRequest: {
    description: "Ask the owner for broader permission without executing any request. This creates an approval carrier only; it does not send network traffic and it does not store secret material. You must provide a one-sentence justification for the owner explaining why this approval is needed. Use this when you need access you do not currently have. If a workflow needs to capture and persist a newly issued API key, JWT, or token, that persistence must happen through an owner action or an owner-configured vault acquisition/custom flow.",
    parameters: {
      type: "object",
      properties: {
        secretAliases: { type: "array", items: { type: "string" }, description: "Human-readable secret names to request." },
        write: { type: "object", description: "Outbound request policy including URL scope and methods." },
        read: { type: "object", description: "Inbound response visibility policy." },
        operation: { type: "string", description: "The operation type, usually 'dispatch_http'." },
        justification: { type: "string", description: "Required. One concise sentence for the owner explaining why this capability is needed." },
      },
      required: ["write", "read", "justification"],
    },
  },
};

export function getAgentToolbox(): readonly VaultToolDefinition[] {
  return Object.entries(AGENT_TOOL_METADATA).map(([name, meta]) => ({
    name,
    description: meta.description,
    parameters: meta.parameters,
  }));
}
