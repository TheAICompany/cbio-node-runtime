export interface AgentDispatchIntent {
  secretAlias?: string;
  targetUrl: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  requestedAt?: string;
}

export interface AgentCapabilityEnvelope {
  vaultId: import("../../vault-core/index.js").VaultId;
  capabilityId: string;
  agentId: string;
  secretIds?: readonly string[];
  secretAliases?: readonly string[];
  operation: "dispatch_http";
  allowedTargets: readonly string[];
  allowedMethods: readonly string[];
  allowedPaths?: readonly string[];
  issuedAt: string;
  expiresAt?: string;
  revocationVersion?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  auditRequired?: boolean;
}

export interface AgentSigner {
  getPublicKey(): Promise<string>;
  sign(input: string): Promise<string>;
}

export interface AgentDispatchTransport {
  dispatch(request: import("../../vault-core/index.js").DispatchRequest): Promise<import("../../vault-core/index.js").DispatchResult>;
}
