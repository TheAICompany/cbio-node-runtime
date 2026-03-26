export interface AgentDispatchIntent {
  secretAlias?: string;
  targetUrl: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  requestedAt?: string;
}

export type AgentCapabilityEnvelope = import("../../vault-core/index.js").AgentCapability;

export interface AgentSigner {
  sign(input: string): Promise<string>;
}

export interface AgentDispatchTransport {
  agentDispatch(request: import("../../vault-core/index.js").DispatchRequest): Promise<import("../../vault-core/index.js").DispatchResult>;
}
