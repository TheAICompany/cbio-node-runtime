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

export interface OwnerAuditQueryInput {
  actorId?: string;
  secretAlias?: string;
  requestId?: string;
  since?: string;
}

export interface OwnerExportSecretInput {
  alias: string;
  requestedAt?: string;
}

export interface OwnerRegisterAgentIdentityInput {
  agentId: string;
  publicKey: string;
  requestedAt?: string;
}

export interface OwnerRegisterOwnerIdentityInput {
  ownerId: string;
  publicKey: string;
  requestedAt?: string;
}

export interface OwnerRegisterCustomHttpFlowInput extends OwnerHttpFlowBoundary {
  flowId: string;
  requestedAt?: string;
}

export interface OwnerRegisterCapabilityInput {
  capability: import("../../vault-core/index.js").AgentCapability;
  requestedAt?: string;
}
