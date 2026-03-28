import type { OwnerHttpFlowBoundary } from "../../vault-ingress/flow-factories.js";

export interface OwnerCreateSecretInput {
  alias: string;
  plaintext: string;
  requestedAt?: string;
}

export interface OwnerUpdateSecretInput {
  alias: string;
  plaintext: string;
  requestedAt?: string;
}

export interface OwnerRemoveSecretInput {
  alias: string;
  password: string;
  verificationCode?: string;
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

export interface VaultGrantAgentSecretInput {
  agentId: string;
  secretAlias: string;
  requestedAt?: string;
}

export interface VaultGrantSecretDestinationInput {
  secretAlias: string;
  domain: string;
  requestedAt?: string;
}

export interface VaultApproveDispatchInput {
  requestId: string;
  decision: import("../../vault-core/index.js").DispatchApprovalDecision;
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

export interface VaultListGrantsInput {
  agentId?: string;
  secretAlias?: string;
  requestedAt?: string;
}

export interface VaultListRequestsInput {
  agentId?: string;
  requestedAt?: string;
}

export interface VaultGetRequestInput {
  requestId: string;
  requestedAt?: string;
}

export interface VaultListSecretsInput {
  requestedAt?: string;
}

export interface VaultRevokeAgentSecretInput {
  agentId: string;
  secretAlias: string;
  requestedAt?: string;
}

export interface VaultRevokeSecretDestinationInput {
  secretAlias: string;
  domain: string;
  requestedAt?: string;
}

export interface VaultIssueSessionTokenInput {
  agentId: string;
  requestedAt?: string;
}

export interface VaultRevokeSessionTokenInput {
  token: string;
}

export interface CreateOwnerClientOptions {
  vault: import("../../vault-ingress/index.js").VaultService;
  ownerIdentity: { rootAgentId: string };
  clock?: import("../../vault-core/index.js").Clock;
  skipWarmup?: boolean;
  passwordVerifier?: (password: string) => Promise<boolean> | boolean;
  sensitiveActionVerifier?: (
    confirmation: OwnerSensitiveActionConfirmation,
    context: OwnerSensitiveActionContext,
  ) => Promise<boolean> | boolean;
}

/**
 * A client for vault owners to manage secrets, agents, and grants.
 */
export interface OwnerClient {
  ownerCreateSecret(input: OwnerCreateSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  ownerUpdateSecret(input: OwnerUpdateSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  ownerExportSecret(input: VaultExportSecretInput): Promise<import("../../vault-core/index.js").OwnerSecretExport>;
  ownerReadSecretPlaintext(input: VaultReadSecretPlaintextInput): Promise<string>;
  ownerReadAgentPrivateKey(input: VaultReadAgentPrivateKeyInput): Promise<string>;
  
  ownerGrantAgentSecret(input: VaultGrantAgentSecretInput): Promise<import("../../vault-core/index.js").AgentSecretGrant>;
  ownerGrantSecretDestination(input: VaultGrantSecretDestinationInput): Promise<import("../../vault-core/index.js").SecretDestinationGrant>;
  ownerRevokeAgentSecret(input: VaultRevokeAgentSecretInput): Promise<void>;
  ownerRevokeSecretDestination(input: VaultRevokeSecretDestinationInput): Promise<void>;
  ownerListGrants(input?: VaultListGrantsInput): Promise<{ 
    agentSecrets: readonly import("../../vault-core/index.js").AgentSecretGrant[], 
    secretDestinations: readonly import("../../vault-core/index.js").SecretDestinationGrant[] 
  }>;

  ownerReadAudit(query?: VaultAuditQueryInput): Promise<readonly import("../../vault-core/index.js").AuditEntry[]>;
  ownerImportAgent(input: VaultImportAgentInput): Promise<OwnerAgentProvisionResult>;
  ownerCreateAgent(input: VaultCreateAgentInput): Promise<OwnerAgentProvisionResult>;
  ownerUpdateAgent(input: VaultUpdateAgentInput): Promise<import("../../vault-core/index.js").AgentIdentityRecord>;
  ownerRegisterFlow(input: VaultRegisterFlowInput): Promise<import("../../vault-core/index.js").CustomHttpFlowDefinition>;
  ownerRemoveSecret(input: OwnerRemoveSecretInput): Promise<void>;
  ownerListAgents(input?: VaultListAgentsInput): Promise<readonly import("../../vault-core/index.js").AgentIdentityRecord[]>;
  ownerListRequests(input?: VaultListRequestsInput): Promise<readonly import("../../vault-core/index.js").OwnerVisibleRequestRecord[]>;
  ownerGetRequest(input: VaultGetRequestInput): Promise<import("../../vault-core/index.js").OwnerRequestRecord>;
  ownerListSecrets(input?: VaultListSecretsInput): Promise<readonly import("../../vault-core/index.js").AgentVisibleSecretRecord[]>;
  
  ownerIssueSessionToken(input: VaultIssueSessionTokenInput): Promise<import("../../vault-core/index.js").OwnerSessionToken>;
  ownerIssueAllSessionTokens(): Promise<readonly import("../../vault-core/index.js").OwnerSessionToken[]>;
  ownerRevokeSessionToken(input: VaultRevokeSessionTokenInput): Promise<void>;
  
  ownerApproveDispatch(input: VaultApproveDispatchInput): Promise<import("../../vault-core/index.js").DispatchResult | null>;
  ownerDenyDispatch(requestId: string): Promise<void>;
  
  ownerOnPendingDispatch(callback: (record: import("../../vault-core/index.js").RequestRecord) => void): () => void;
}
