import type { OwnerHttpFlowBoundary } from "../../vault-ingress/flow-factories.js";

export interface OwnerWriteSecretInput {
  alias: string;
  plaintext: string;
  requestedAt?: string;
}

export interface OwnerStoreSecretInput {
  alias: string;
  plaintext: string;
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
  password: string;
  verificationCode?: string;
  requestedAt?: string;
}

export interface VaultReadSecretPlaintextInput {
  alias: string;
  password: string;
  verificationCode?: string;
  requestedAt?: string;
}

export interface VaultReadAgentPrivateKeyInput {
  agentId: string;
  password: string;
  verificationCode?: string;
  requestedAt?: string;
}

export interface OwnerSensitiveActionConfirmation {
  password: string;
  verificationCode?: string;
}

export interface OwnerSensitiveActionContext {
  action: "read_secret_plaintext" | "export_secret" | "read_agent_private_key" | "delete_secret";
  subject: string;
}

export interface VaultImportAgentInput {
  privateKey: string;
  metadata?: Record<string, any>;
  nickname?: string;
  requestedAt?: string;
}

export interface VaultCreateAgentInput {
  metadata?: Record<string, any>;
  nickname?: string;
  requestedAt?: string;
}

export interface OwnerAgentProvisionResult {
  agent: import("../../vault-core/index.js").AgentIdentityRecord;
  sessionToken: import("../../vault-core/index.js").OwnerSessionToken;
}

export interface VaultRegisterFlowInput extends OwnerHttpFlowBoundary {
  requestedAt?: string;
}

export interface VaultGrantCapabilityInput {
  agentId: string;
  operation?: string;
  secretAliases?: readonly string[];
  secretIds?: readonly string[];
  customFlowId?: string;
  scope: string;
  methods: readonly string[];
  expiresAt?: string;
  expiresIn?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  skipAudit?: boolean;
  auditRequired?: boolean;
  requestedAt?: string;
}

export interface VaultGrantCapabilityRequest {
  capability: import("../../vault-core/index.js").AgentCapability & {
    auditRequired?: boolean;
  };
  requestedAt?: string;
}

export type OwnerGrantCapabilityInput = VaultGrantCapabilityInput | VaultGrantCapabilityRequest;

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
  requestedAt?: string;
}

export interface VaultListCapabilityStatesInput {
  agentId?: string;
  status?: import("../../vault-core/index.js").AgentCapabilityStateStatus;
  requestedAt?: string;
}

export interface VaultDeleteSecretInput {
  alias: string;
  password: string;
  verificationCode?: string;
  requestedAt?: string;
}

export interface VaultUpdateAgentInput {
  agentId: string;
  nickname?: string;
  metadata?: Record<string, any>;
  requestedAt?: string;
}

export interface VaultListAgentsInput {
  requestedAt?: string;
}

export interface VaultListCapabilitiesInput {
  agentId?: string;
  requestedAt?: string;
}

export interface VaultListSecretsInput {
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
  passwordVerifier?: (password: string) => Promise<boolean> | boolean;
  sensitiveActionVerifier?: (
    confirmation: OwnerSensitiveActionConfirmation,
    context: OwnerSensitiveActionContext,
  ) => Promise<boolean> | boolean;
}

/**
 * A client for vault owners to manage secrets, agents, and capabilities.
 */
export interface VaultClient {
  ownerStoreSecret(input: OwnerStoreSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  ownerWriteSecret(input: OwnerWriteSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  ownerExportSecret(input: VaultExportSecretInput): Promise<import("../../vault-core/index.js").OwnerSecretExport>;
  ownerReadSecretPlaintext(input: VaultReadSecretPlaintextInput): Promise<string>;
  ownerReadAgentPrivateKey(input: VaultReadAgentPrivateKeyInput): Promise<string>;
  ownerGrantCapability(input: OwnerGrantCapabilityInput): Promise<import("../../vault-core/index.js").AgentCapability>;
  ownerReadAudit(query?: VaultAuditQueryInput): Promise<readonly import("../../vault-core/index.js").AuditEntry[]>;
  ownerImportAgent(input: VaultImportAgentInput): Promise<OwnerAgentProvisionResult>;
  ownerCreateAgent(input: VaultCreateAgentInput): Promise<OwnerAgentProvisionResult>;
  ownerUpdateAgent(input: VaultUpdateAgentInput): Promise<import("../../vault-core/index.js").AgentIdentityRecord>;
  ownerRegisterFlow(input: VaultRegisterFlowInput): Promise<import("../../vault-core/index.js").CustomHttpFlowDefinition>;
  ownerDeleteSecret(input: VaultDeleteSecretInput): Promise<void>;
  ownerListAgents(input?: VaultListAgentsInput): Promise<readonly import("../../vault-core/index.js").AgentIdentityRecord[]>;
  ownerListCapabilities(input?: VaultListCapabilitiesInput): Promise<readonly import("../../vault-core/index.js").AgentCapability[]>;
  ownerListCapabilityStates(input?: VaultListCapabilityStatesInput): Promise<readonly import("../../vault-core/index.js").CapabilityStateRecord[]>;
  ownerListSecrets(input?: VaultListSecretsInput): Promise<readonly import("../../vault-core/index.js").AgentVisibleSecretRecord[]>;
  ownerRevokeCapability(input: VaultRevokeCapabilityInput): Promise<void>;
  ownerIssueSessionToken(input: VaultIssueSessionTokenInput): Promise<import("../../vault-core/index.js").OwnerSessionToken>;
  ownerIssueAllSessionTokens(): Promise<readonly import("../../vault-core/index.js").OwnerSessionToken[]>;
  ownerRevokeSessionToken(input: VaultRevokeSessionTokenInput): Promise<void>;
  ownerSubmitCapabilityRequest(input: VaultSubmitCapabilityRequestInput): Promise<import("../../vault-core/index.js").CapabilityStateRecord>;
  ownerExecuteCapabilityStateOnce(input: VaultApproveCapabilityRequestInput): Promise<import("../../vault-core/index.js").DispatchResult>;
  ownerExecuteCapabilityStateAndGrant(input: VaultApproveCapabilityRequestInput): Promise<import("../../vault-core/index.js").DispatchResult>;
  ownerRejectCapabilityState(requestId: string): Promise<import("../../vault-core/index.js").CapabilityStateRecord>;
  ownerOnCapabilityState(callback: (record: import("../../vault-core/index.js").CapabilityStateRecord) => void): () => void;
}
