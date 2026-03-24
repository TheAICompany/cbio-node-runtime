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
  capability: import("../../vault-core/index.js").AgentCapability;
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
