export interface AgentDispatchIntent {
  secretAlias?: string;
  targetUrl: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  requestedAt?: string;
}

export interface AgentSubmitCapabilityRequestInput {
  operation?: "dispatch_http" | "custom_http";
  secretAliases?: readonly string[];
  scope: string;
  methods: readonly string[];
  justification?: string;
  requestedAt?: string;
}

export type AgentCapabilityEnvelope = import("../../vault-core/index.js").AgentCapability;
export type AgentCapabilityState = import("../../vault-core/index.js").AgentCapabilityState;
export type AgentVisibleSecretRecord = import("../../vault-core/index.js").AgentVisibleSecretRecord;

export interface AgentSigner {
  sign(input: string): Promise<string>;
}

export interface AgentDispatchTransport {
  agentDispatch(request: import("../../vault-core/index.js").DispatchRequest): Promise<import("../../vault-core/index.js").DispatchResult>;
  agentListCapabilities(request: import("../../vault-core/index.js").AgentListCapabilitiesRequest): Promise<readonly AgentCapabilityState[]>;
  agentListSecrets(request: import("../../vault-core/index.js").AgentListSecretsRequest): Promise<readonly AgentVisibleSecretRecord[]>;
  agentGetRuntimeManifest(request: import("../../vault-core/index.js").AgentGetRuntimeManifestRequest): Promise<import("../../vault-core/index.js").AgentRuntimeManifest>;
  agentSubmitCapabilityRequest(request: import("../../vault-core/index.js").AgentSubmitCapabilityRequestCommand): Promise<import("../../vault-core/index.js").CapabilityStateRecord>;
}
