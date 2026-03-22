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
