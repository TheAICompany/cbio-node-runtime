

export interface OwnerCreateSecretInput {
  alias: string;
  plaintext: string;
  requested_at?: string;
}

export interface OwnerUpdateSecretInput {
  alias: string;
  new_alias?: string;
  plaintext?: string;
  requested_at?: string;
}

export interface OwnerRemoveSecretInput {
  alias: string;
  password: string;
  verificationCode?: string;
  requested_at?: string;
}

export interface VaultAuditQueryInput {
  actor_id?: string;
  root_agent_id?: string;
  secret_alias?: string;
  request_id?: string;
  since?: string;
}

export interface VaultExportSecretInput {
  alias?: string;
  password: string;
  verificationCode?: string;
  requested_at?: string;
}

export interface VaultReadSecretPlaintextInput {
  alias: string;
  password: string;
  verificationCode?: string;
  requested_at?: string;
}

export interface VaultReadAgentPrivateKeyInput {
  root_agent_id: string;
  password: string;
  verificationCode?: string;
  requested_at?: string;
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
  private_key: string;
  metadata?: Record<string, any>;
  nickname?: string;
  requested_at?: string;
}

export interface VaultCreateAgentInput {
  metadata?: Record<string, any>;
  nickname?: string;
  requested_at?: string;
}

export interface OwnerAgentProvisionResult {
  agent: import("../../vault-core/index.js").AgentIdentityRecord;
  session_token: import("../../vault-core/index.js").OwnerSessionToken;
}



export interface VaultGrantAgentSecretInput {
  root_agent_id: string;
  secret_alias: string;
  requested_at?: string;
}

export interface VaultGrantSecretDestinationInput {
  secret_alias: string;
  site_id: string;
  requested_at?: string;
}

export interface VaultApproveDispatchInput {
  request_id: string;
  decision: import("../../vault-core/index.js").DispatchApprovalDecision;
  requested_at?: string;
}

export interface VaultUpdateAgentInput {
  root_agent_id: string;
  nickname?: string;
  metadata?: Record<string, any>;
  requested_at?: string;
}

export interface VaultListAgentsInput {
  requested_at?: string;
}

export interface VaultListGrantsInput {
  root_agent_id?: string;
  secret_alias?: string;
  requested_at?: string;
}

export interface VaultListRequestsInput {
  root_agent_id?: string;
  requested_at?: string;
}

export interface VaultGetRequestInput {
  request_id: string;
  requested_at?: string;
}

export interface VaultListSecretsInput {
  requested_at?: string;
}

export interface VaultRevokeAgentSecretInput {
  root_agent_id: string;
  secret_alias: string;
  requested_at?: string;
}

export interface VaultRevokeSecretDestinationInput {
  secret_alias: string;
  site_id: string;
  requested_at?: string;
}

export interface VaultIssueSessionTokenInput {
  root_agent_id: string;
  requested_at?: string;
}

export interface VaultRevokeSessionTokenInput {
  token: string;
}

export interface CreateOwnerClientOptions {
  vault: import("../../vault-ingress/index.js").VaultService;
  clock?: import("../../vault-core/index.js").Clock;
  skipWarmup?: boolean;
  password_verifier?: (password: string) => Promise<boolean> | boolean;
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
  ownerCreateSecret(input: OwnerCreateSecretInput[]): Promise<import("../../vault-core/index.js").SecretRecord[]>;
  ownerUpdateSecret(input: OwnerUpdateSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  ownerUpdateSecret(input: OwnerUpdateSecretInput[]): Promise<import("../../vault-core/index.js").SecretRecord[]>;
  ownerExportSecret(input: VaultExportSecretInput): Promise<readonly import("../../vault-core/index.js").OwnerSecretExport[]>;
  ownerReadSecretPlaintext(input: VaultReadSecretPlaintextInput): Promise<string>;
  ownerReadAgentPrivateKey(input: VaultReadAgentPrivateKeyInput): Promise<string>;
  
  ownerGrantAgentSecret(input: VaultGrantAgentSecretInput): Promise<import("../../vault-core/index.js").AgentSecretGrant>;
  ownerGrantSecretDestination(input: VaultGrantSecretDestinationInput): Promise<import("../../vault-core/index.js").SecretDestinationGrant>;
  ownerRevokeAgentSecret(input: VaultRevokeAgentSecretInput): Promise<void>;
  ownerRevokeSecretDestination(input: VaultRevokeSecretDestinationInput): Promise<void>;
  ownerListGrants(input?: VaultListGrantsInput): Promise<{ 
    agent_secrets: readonly import("../../vault-core/index.js").AgentSecretGrant[], 
    secret_destinations: readonly import("../../vault-core/index.js").SecretDestinationGrant[] 
  }>;

  ownerReadAudit(query?: VaultAuditQueryInput): Promise<readonly import("../../vault-core/index.js").AuditEntry[]>;
  ownerImportAgent(input: VaultImportAgentInput): Promise<OwnerAgentProvisionResult>;
  ownerCreateAgent(input: VaultCreateAgentInput): Promise<OwnerAgentProvisionResult>;
  ownerUpdateAgent(input: VaultUpdateAgentInput): Promise<import("../../vault-core/index.js").AgentIdentityRecord>;

  ownerRemoveSecret(input: OwnerRemoveSecretInput): Promise<void>;
  ownerListAgents(input?: VaultListAgentsInput): Promise<readonly import("../../vault-core/index.js").AgentIdentityRecord[]>;
  ownerListRequests(input?: VaultListRequestsInput): Promise<readonly import("../../vault-core/index.js").OwnerVisibleRequestRecord[]>;
  ownerGetRequest(input: VaultGetRequestInput): Promise<import("../../vault-core/index.js").OwnerRequestRecord>;
  ownerListSecrets(input?: VaultListSecretsInput): Promise<readonly import("../../vault-core/index.js").AgentVisibleSecretRecord[]>;
  
  ownerIssueSessionToken(input: VaultIssueSessionTokenInput): Promise<import("../../vault-core/index.js").OwnerSessionToken>;
  ownerIssueAllSessionTokens(): Promise<readonly import("../../vault-core/index.js").OwnerSessionToken[]>;
  ownerRevokeSessionToken(input: VaultRevokeSessionTokenInput): Promise<void>;
  
  ownerApproveDispatch(input: VaultApproveDispatchInput): Promise<import("../../vault-core/index.js").DispatchResult | null>;
  ownerDenyDispatch(request_id: string): Promise<void>;
  
  ownerOnPendingDispatch(subscription: import("../../vault-core/index.js").OwnerPendingDispatchSubscription): () => void;
  ownerOnAudit(subscription: import("../../vault-core/index.js").OwnerAuditSubscription): () => void;
}
