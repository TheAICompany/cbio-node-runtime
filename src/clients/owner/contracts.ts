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
  scope: string;
  methods: readonly string[];
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

export interface VaultSubmitCapabilityRequestInput {
  requester: import("../../vault-core/index.js").VaultPrincipal;
  agentId: string;
  operation?: string;
  secretAliases?: readonly string[];
  scope: string;
  methods: readonly string[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  skipAudit?: boolean;
  expiresAt?: string;
  justification?: string;
  requestedAt?: string;
}

export interface VaultApproveCapabilityRequestInput {
  requestId: string;
  capabilityId?: string;
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
  ownerStoreSecret(input: OwnerStoreSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  ownerDefineSecretTargets(input: OwnerDefineSecretTargetsInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  ownerWriteSecret(input: OwnerWriteSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  ownerExportSecret(input: VaultExportSecretInput): Promise<import("../../vault-core/index.js").OwnerSecretExport>;
  ownerGrantCapability(input: VaultGrantCapabilityInput): Promise<void>;
  ownerReadAudit(query?: VaultAuditQueryInput): Promise<readonly import("../../vault-core/index.js").AuditEntry[]>;
  ownerRegisterAgent(input: VaultRegisterAgentInput): Promise<void>;
  ownerCreateAgent(input: VaultCreateAgentInput): Promise<readonly [import("../../vault-core/index.js").AgentIdentityRecord, string]>;
  ownerRegisterFlow(input: VaultRegisterFlowInput): Promise<void>;
  ownerDeleteSecret(input: VaultDeleteSecretInput): Promise<void>;
  ownerListAgents(input?: VaultListAgentsInput): Promise<readonly import("../../vault-core/index.js").AgentIdentityRecord[]>;
  ownerListCapabilities(input?: VaultListCapabilitiesInput): Promise<readonly import("../../vault-core/index.js").AgentCapability[]>;
  ownerRevokeCapability(input: VaultRevokeCapabilityInput): Promise<void>;
  ownerIssueSessionToken(input: VaultIssueSessionTokenInput): Promise<import("../../vault-core/index.js").OwnerSessionToken>;
  ownerIssueAllSessionTokens(): Promise<readonly import("../../vault-core/index.js").OwnerSessionToken[]>;
  ownerRevokeSessionToken(input: VaultRevokeSessionTokenInput): Promise<void>;
  ownerSubmitCapabilityRequest(input: VaultSubmitCapabilityRequestInput): Promise<import("../../vault-core/index.js").PendingCapabilityRequestRecord>;
  ownerListPendingCapabilityRequests(): Promise<readonly import("../../vault-core/index.js").PendingCapabilityRequestRecord[]>;
  ownerApproveCapabilityRequest(input: VaultApproveCapabilityRequestInput): Promise<import("../../vault-core/index.js").AgentCapability>;
  ownerRejectCapabilityRequest(requestId: string): Promise<void>;
  ownerListPendingDispatches(): Promise<readonly import("../../vault-core/index.js").PendingDispatchRecord[]>;
  ownerApproveDispatch(input: VaultApproveDispatchInput): Promise<import("../../vault-core/index.js").DispatchResult>;
  ownerRejectDispatch(requestId: string): Promise<void>;
  ownerOnPendingDispatch(callback: (record: import("../../vault-core/index.js").PendingDispatchRecord) => void): () => void;
  ownerOnPendingCapabilityRequest(callback: (record: import("../../vault-core/index.js").PendingCapabilityRequestRecord) => void): () => void;
}
