export interface AgentDispatchIntent {
  secretAlias?: string;
  targetUrl: string;
  method: string;
  reason: string;
  headers?: Record<string, string>;
  body?: string;
  requestedAt?: string;
}

export interface AgentSubmitCapabilityRequestInput {
  operation?: "dispatch_http" | "custom_http";
  secretAliases?: readonly string[];
  write: Omit<import("../../vault-core/index.js").CapabilityWritePolicy, "secretIds">;
  read: import("../../vault-core/index.js").CapabilityReadPolicy;
  reason: string;
  requestedAt?: string;
}

export type AgentCapabilityEnvelope = import("../../vault-core/index.js").AgentCapability;
export type AgentCapabilityState = import("../../vault-core/index.js").AgentCapabilityState;
export type AgentVisibleSecretRecord = import("../../vault-core/index.js").AgentVisibleSecretRecord;
export type AgentVisibleRequestRecord = import("../../vault-core/index.js").AgentVisibleRequestRecord;

export interface AgentSigner {
  sign(input: string): Promise<string>;
}

export interface AgentDispatchTransport {
  agentDispatch(request: import("../../vault-core/index.js").DispatchRequest): Promise<import("../../vault-core/index.js").DispatchResult>;
  agentListCapabilities(request: import("../../vault-core/index.js").AgentListCapabilitiesRequest): Promise<readonly AgentCapabilityState[]>;
  agentListSecrets(request: import("../../vault-core/index.js").AgentListSecretsRequest): Promise<readonly AgentVisibleSecretRecord[]>;
  agentListRequests(request: import("../../vault-core/index.js").AgentListRequestsRequest): Promise<readonly AgentVisibleRequestRecord[]>;
  agentGetRequest(request: import("../../vault-core/index.js").AgentGetRequestRequest): Promise<import("../../vault-core/index.js").AgentRequestResult>;
  agentGetRuntimeManifest(request: import("../../vault-core/index.js").AgentGetRuntimeManifestRequest): Promise<import("../../vault-core/index.js").AgentRuntimeManifest>;
  agentSubmitCapabilityRequest(request: import("../../vault-core/index.js").AgentSubmitCapabilityRequestCommand): Promise<import("../../vault-core/index.js").CapabilityStateRecord>;
}
