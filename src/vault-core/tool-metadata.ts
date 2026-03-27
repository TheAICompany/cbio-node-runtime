import type { VaultToolDefinition } from "./contracts.js";

export const AGENT_TOOL_METADATA: Record<string, { description: string; parameters: Record<string, any> }> = {
  agentIntrospect: {
    description: "Get a manifest of your identity, capabilities, and all available tools. This is your '--help' and 'llms.txt'.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  agentDispatch: {
    description: "Use a granted capability to dispatch a secret to a pre-defined target. If not pre-authorized, it will create a pending request for owner approval.",
    parameters: {
      type: "object",
      properties: {
        secretId: { type: "string", description: "The stable secret ID to use." },
        targetUrl: { type: "string", description: "The destination URL for the secret." },
        method: { type: "string", description: "The HTTP method (e.g., POST, GET)." },
        body: { type: "string", description: "Optional request body." },
        headers: { type: "object", description: "Optional request headers." },
      },
      required: ["secretId", "targetUrl", "method"],
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
    description: "List all secrets in the vault. Includes metadata about whether you are authorized to use each secret.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  agentSubmitCapabilityRequest: {
    description: "Proactively request a new capability (set of permissions) from the vault owner.",
    parameters: {
      type: "object",
      properties: {
        write: { type: "object", description: "Outbound request policy including secret IDs, scope, and methods." },
        read: { type: "object", description: "Inbound response visibility policy." },
        operation: { type: "string", description: "The operation type, usually 'dispatch_http'." },
        justification: { type: "string", description: "Why you need this capability." },
      },
      required: ["write", "read"],
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
