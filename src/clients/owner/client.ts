import { LocalSigner } from "../../protocol/crypto.js";
import type { CreatedIdentity } from "../../runtime/identity.js";
import { SystemClock, type Clock } from "../../vault-core/index.js";
import type { VaultService } from "../../vault-ingress/index.js";
import type {
  VaultAuditQueryInput,
  OwnerDefineSecretTargetsInput,
  VaultExportSecretInput,
  VaultGrantCapabilityInput,
  VaultRegisterFlowInput,
  VaultRegisterAgentInput,
  OwnerStoreSecretInput,
  OwnerWriteSecretInput,
  VaultDeleteSecretInput,
  VaultListAgentsInput,
  VaultListCapabilitiesInput,
  VaultRevokeCapabilityInput,
} from "./contracts.js";

export interface VaultIdentity {
  identityId: string;
}

export interface VaultSigner {
  sign(input: string): Promise<string>;
}

/**
 * A client for vault owners to manage secrets, agents, and capabilities.
 * In Sovereign Vault model, administrative actions are implicitly authorized by the working key.
 */
export interface VaultClient {
  /**
   * Securely stores a new secret in the vault.
   */
  storeSecret(input: OwnerStoreSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;

  /**
   * Refines the allowed targets for an existing secret.
   */
  defineSecretTargets(input: OwnerDefineSecretTargetsInput): Promise<import("../../vault-core/index.js").SecretRecord>;

  /**
   * Atomic operation to store a secret and define its targets in one step.
   */
  writeSecret(input: OwnerWriteSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;

  /**
   * Exports a secret's plaintext.
   */
  exportSecret(input: VaultExportSecretInput): Promise<import("../../vault-core/index.js").OwnerSecretExport>;

  /**
   * Grants a specific capability to an agent.
   */
  grantCapability(input: VaultGrantCapabilityInput): Promise<void>;

  /**
   * Reads the tamper-evident audit log for the vault.
   */
  readAudit(query?: VaultAuditQueryInput): Promise<readonly import("../../vault-core/index.js").AuditEntry[]>;

  /**
   * Registers a new agent identity within the vault.
   */
  registerAgent(input: VaultRegisterAgentInput): Promise<void>;

  /**
   * Registers a custom HTTP flow for complex secret usage.
   */
  registerFlow(input: VaultRegisterFlowInput): Promise<void>;

  /**
   * Permanently deletes a secret from the vault.
   */
  deleteSecret(input: VaultDeleteSecretInput): Promise<void>;

  /**
   * Lists all agents registered in the vault.
   */
  listAgents(input?: VaultListAgentsInput): Promise<readonly import("../../vault-core/index.js").AgentIdentityRecord[]>;

  /**
   * Lists all active capabilities granted to agents.
   */
  listCapabilities(input?: VaultListCapabilitiesInput): Promise<readonly import("../../vault-core/index.js").AgentCapability[]>;

  /**
   * Revokes a previously granted capability.
   */
  revokeCapability(input: VaultRevokeCapabilityInput): Promise<void>;
}

export interface CreateVaultClientOptions {
  vault: VaultService;
  ownerIdentity?: CreatedIdentity | VaultIdentity;
  signer?: VaultSigner;
  clock?: Clock;
}

const VAULT_MASTER_ID = "vault-master";

class DefaultVaultClient implements VaultClient {
  private readonly _identityId: string;

  constructor(
    private readonly _vault: VaultService,
    private readonly _identity?: VaultIdentity,
    private readonly _signer?: VaultSigner,
    private readonly _clock: Clock = new SystemClock(),
  ) {
    this._identityId = _identity?.identityId ?? VAULT_MASTER_ID;
  }

  async storeSecret(input: OwnerStoreSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:${input.alias}:write_secret`;
    
    return this._vault.writeSecret({
      kind: "owner.write_secret",
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      alias: input.alias,
      plaintext: input.plaintext,
      targetBindings: [],
      requestedAt,
    });
  }

  async defineSecretTargets(input: OwnerDefineSecretTargetsInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:${input.alias}:define_secret_targets`;
    const targetBindings = [...input.targetBindings];
    
    return this._vault.defineSecretTargets({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      alias: input.alias,
      targetBindings,
      requestedAt,
    });
  }

  async writeSecret(input: OwnerWriteSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:${input.alias}:write_secret`;
    const targetBindings = [...input.targetBindings];
    
    return this._vault.writeSecret({
      kind: "owner.write_secret",
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      alias: input.alias,
      plaintext: input.plaintext,
      targetBindings,
      requestedAt,
    });
  }

  async readAudit(query: VaultAuditQueryInput = {}) {
    const requestedAt = this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:read_audit`;
    
    return this._vault.readAudit({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
      query,
      requestId,
      requestedAt,
    });
  }

  async exportSecret(input: VaultExportSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:${input.alias}:export_secret`;
    
    return this._vault.exportSecret({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
      alias: input.alias,
      requestId,
      requestedAt,
    });
  }

  async registerAgent(input: VaultRegisterAgentInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:${input.agentId}:register_agent_identity`;
    const agentIdentity = {
      vaultId: this._vault.vaultId,
      agentId: input.agentId,
      publicKey: input.publicKey,
    };
    
    await this._vault.registerAgentIdentity({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      agentIdentity,
      requestedAt,
    });
  }

  async grantCapability(input: VaultGrantCapabilityInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:${input.capability.capabilityId}:register_capability`;
    const capability = {
      ...input.capability,
      vaultId: this._vault.vaultId,
    };
    
    await this._vault.registerCapability({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      capability,
      requestedAt,
    });
  }

  async registerFlow(input: VaultRegisterFlowInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:${input.flowId}:register_custom_flow`;
    const flow = {
      flowId: input.flowId,
      mode: input.mode,
      targetUrl: input.targetUrl,
      method: input.method,
      responseVisibility: input.responseVisibility,
      responseSecret: input.responseSecret,
    };
    
    await this._vault.registerCustomFlow({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      flow,
      requestedAt,
    });
  }

  async deleteSecret(input: VaultDeleteSecretInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:${input.alias}:delete_secret`;
    
    await this._vault.deleteSecret({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      alias: input.alias,
      requestedAt,
    });
  }

  async listAgents(input: VaultListAgentsInput = {}) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:list_agents`;
    
    return this._vault.listAgents({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
    });
  }

  async listCapabilities(input: VaultListCapabilitiesInput = {}) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:list_capabilities`;
    
    return this._vault.listCapabilities({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      actor: {
        kind: "owner",
        id: this._identityId,
      },
      agentId: input.agentId,
    });
  }

  async revokeCapability(input: VaultRevokeCapabilityInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identityId}:${requestedAt}:revoke_capability`;
    
    return this._vault.revokeCapability({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      owner: {
        kind: "owner",
        id: this._identityId,
      },
      agentId: input.agentId,
      capabilityId: input.capabilityId,
    });
  }
}

function isCreateVaultClientOptions(value: unknown): value is CreateVaultClientOptions {
  return typeof value === "object" && value !== null && "vault" in value;
}

function isCreatedIdentity(value: VaultIdentity | CreatedIdentity): value is CreatedIdentity {
  return "privateKey" in value && "publicKey" in value;
}

function resolveVaultSigner(identity?: VaultIdentity | CreatedIdentity, signer?: VaultSigner): VaultSigner | undefined {
  if (signer) {
    return signer;
  }
  if (identity && isCreatedIdentity(identity)) {
    return new LocalSigner(identity);
  }
  return undefined;
}

function resolveVaultIdentity(options: CreateVaultClientOptions): VaultIdentity | undefined {
  if (!options.ownerIdentity) {
    return undefined;
  }
  return {
    identityId: options.ownerIdentity.identityId,
  };
}

/**
 * Creates a {@link VaultClient} instance for a specific vault owner.
 *
 * @param options - Configuration including optional owner identity and the vault service.
 * @returns An initialized {@link VaultClient}.
 *
 * @example
 * ```ts
 * const client = createVaultClient({
 *   ownerIdentity,
 *   vault
 * });
 * ```
 */
export function createVaultClient(options: CreateVaultClientOptions): VaultClient {
  if (!isCreateVaultClientOptions(options)) {
    throw new Error("createVaultClient() requires a single options object with 'vault'");
  }
  return new DefaultVaultClient(
    options.vault,
    resolveVaultIdentity(options),
    resolveVaultSigner(options.ownerIdentity, options.signer),
    options.clock ?? new SystemClock(),
  );
}
