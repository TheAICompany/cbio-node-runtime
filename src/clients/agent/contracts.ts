export interface AgentDispatchIntent {
  secret_alias?: string;
  target_url: string;
  method: string;
  reason: string;
  headers?: Record<string, string>;
  body?: string;
  requested_at?: string;
}

export interface AgentRequestGrantsInput {
  secret_aliases?: readonly string[];
  reason: string;
  requested_at?: string;
}

export type SecretRecordNode = import("../../vault-core/index.js").SecretRecord;
export type AgentRequestRecordNode = import("../../vault-core/index.js").AgentRequestRecord;

export interface AgentSigner {
  sign(input: string): Promise<string>;
}

export interface AgentDispatchTransport {
  agentDispatch(request: import("../../vault-core/index.js").DispatchRequest): Promise<import("../../vault-core/index.js").DispatchResult>;
  agentListSecrets(request: import("../../vault-core/index.js").AgentListSecretsRequest): Promise<readonly SecretRecordNode[]>;
  agentListRequests(request: import("../../vault-core/index.js").AgentListRequestsRequest): Promise<readonly AgentRequestRecordNode[]>;
  agentGetRequest(request: import("../../vault-core/index.js").AgentGetRequestRequest): Promise<import("../../vault-core/index.js").AgentRequestResult>;
  agentGetRuntimeManifest(request: import("../../vault-core/index.js").AgentGetRuntimeManifestRequest): Promise<import("../../vault-core/index.js").AgentRuntimeManifest>;
}
