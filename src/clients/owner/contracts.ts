import type { OwnerHttpFlowBoundary } from "../../vault-ingress/flow-factories.js";

export interface OwnerSecretTargetBinding {
  kind: "owner" | "site";
  targetId: string;
  targetUrl?: string;
  methods?: readonly string[];
  paths?: readonly string[];
}

export interface OwnerWriteSecretInput {
  alias: string;
  plaintext: string;
  targetBindings: readonly OwnerSecretTargetBinding[];
  requestedAt?: string;
}

export interface OwnerStoreSecretInput {
  alias: string;
  plaintext: string;
  requestedAt?: string;
}

export interface OwnerDefineSecretTargetsInput {
  alias: string;
  targetBindings: readonly OwnerSecretTargetBinding[];
  requestedAt?: string;
}

export interface VaultAuditQueryInput {
  actorId?: string;
  secretAlias?: string;
  requestId?: string;
  since?: string;
}

export interface VaultExportSecretInput {
  alias: string;
  requestedAt?: string;
}

export interface VaultRegisterAgentInput {
  agentId: string;
  publicKey: string;
  privateKey?: string;
  metadata?: Record<string, any>;
  nickname?: string;
  requestedAt?: string;
}

export interface VaultCreateAgentInput {
  agentId: string;
  metadata?: Record<string, any>;
  nickname?: string;
  requestedAt?: string;
}

export interface VaultRegisterFlowInput extends OwnerHttpFlowBoundary {
  flowId: string;
  requestedAt?: string;
}

export interface VaultGrantCapabilityInput {
  agentId: string;
  capabilityId?: string;
  operation?: string;
  secretAliases?: readonly string[];
  allowedTargets?: readonly string[];
  allowedMethods?: readonly string[];
  allowedPaths?: readonly string[];
  expiresIn?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  skipAudit?: boolean;
  requestedAt?: string;
}

export interface VaultApproveDispatchInput {
  requestId: string;
  permanent?: boolean;
  skipAudit?: boolean;
  requestedAt?: string;
}

export interface VaultDeleteSecretInput {
  alias: string;
  requestedAt?: string;
}

export interface VaultListAgentsInput {
  requestedAt?: string;
}

export interface VaultListCapabilitiesInput {
  agentId?: string;
  requestedAt?: string;
}

export interface VaultRevokeCapabilityInput {
  agentId: string;
  capabilityId: string;
  requestedAt?: string;
}

export interface VaultIssueSessionTokenInput {
  agentId: string;
  requestedAt?: string;
}

export interface VaultRevokeSessionTokenInput {
  token: string;
}

export interface CreateVaultClientOptions {
  vault: import("../../vault-ingress/index.js").VaultService;
  ownerIdentity: { identityId: string };
  clock?: import("../../vault-core/index.js").Clock;
  skipWarmup?: boolean;
}

/**
 * A client for vault owners to manage secrets, agents, and capabilities.
 */
export interface VaultClient {
  storeSecret(input: OwnerStoreSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  defineSecretTargets(input: OwnerDefineSecretTargetsInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  writeSecret(input: OwnerWriteSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  exportSecret(input: VaultExportSecretInput): Promise<import("../../vault-core/index.js").OwnerSecretExport>;
  grantCapability(input: VaultGrantCapabilityInput): Promise<void>;
  readAudit(query?: VaultAuditQueryInput): Promise<readonly import("../../vault-core/index.js").AuditEntry[]>;
  registerAgent(input: VaultRegisterAgentInput): Promise<void>;
  createAgent(input: VaultCreateAgentInput): Promise<readonly [import("../../vault-core/index.js").AgentIdentityRecord, string]>;
  registerFlow(input: VaultRegisterFlowInput): Promise<void>;
  deleteSecret(input: VaultDeleteSecretInput): Promise<void>;
  listAgents(input?: VaultListAgentsInput): Promise<readonly import("../../vault-core/index.js").AgentIdentityRecord[]>;
  listCapabilities(input?: VaultListCapabilitiesInput): Promise<readonly import("../../vault-core/index.js").AgentCapability[]>;
  revokeCapability(input: VaultRevokeCapabilityInput): Promise<void>;
  issueSessionToken(input: VaultIssueSessionTokenInput): Promise<import("../../vault-core/index.js").OwnerSessionToken>;
  issueAllSessionTokens(): Promise<readonly import("../../vault-core/index.js").OwnerSessionToken[]>;
  revokeSessionToken(input: VaultRevokeSessionTokenInput): Promise<void>;
  listPendingDispatches(): Promise<readonly import("../../vault-core/index.js").PendingDispatchRecord[]>;
  approveDispatch(input: VaultApproveDispatchInput): Promise<import("../../vault-core/index.js").DispatchResult>;
  rejectDispatch(requestId: string): Promise<void>;
  onPendingRequest(callback: (record: import("../../vault-core/index.js").PendingDispatchRecord) => void): () => void;
}
