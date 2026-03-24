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
 * This client requires an owner signature for every operation.
 */
export interface VaultClient {
  /**
   * Securely stores a new secret in the vault.
   * @param input - The secret alias and plaintext.
   * @returns The record of the stored secret.
   * @example
   * ```ts
   * await client.storeSecret({ alias: 'db-pass', plaintext: 's3cret' });
   * ```
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
   * Exports a secret's plaintext (requires owner permission).
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
  ownerIdentity: CreatedIdentity | VaultIdentity;
  vault: VaultService;
  signer?: VaultSigner;
  clock?: Clock;
}

class DefaultVaultClient implements VaultClient {
  constructor(
    private readonly _identity: VaultIdentity,
    private readonly _vault: VaultService,
    private readonly _signer: VaultSigner,
    private readonly _clock: Clock,
  ) {}

  async storeSecret(input: OwnerStoreSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:${input.alias}:write_secret`;
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      alias: input.alias,
      plaintext: input.plaintext,
      targetBindings: [],
    }));
    return this._vault.writeSecret({
      kind: "owner.write_secret",
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identity.identityId,
      },
      alias: input.alias,
      plaintext: input.plaintext,
      targetBindings: [],
      requestedAt,
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async defineSecretTargets(input: OwnerDefineSecretTargetsInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:${input.alias}:define_secret_targets`;
    const targetBindings = [...input.targetBindings];
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      alias: input.alias,
      targetBindings,
    }));
    return this._vault.defineSecretTargets({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identity.identityId,
      },
      alias: input.alias,
      targetBindings,
      requestedAt,
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async writeSecret(input: OwnerWriteSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:${input.alias}:write_secret`;
    const targetBindings = [...input.targetBindings];
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      alias: input.alias,
      plaintext: input.plaintext,
      targetBindings,
    }));
    return this._vault.writeSecret({
      kind: "owner.write_secret",
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identity.identityId,
      },
      alias: input.alias,
      plaintext: input.plaintext,
      targetBindings,
      requestedAt,
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async readAudit(query: VaultAuditQueryInput = {}) {
    const requestedAt = this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:read_audit`;
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      query,
    }));
    return this._vault.readAudit({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._identity.identityId,
      },
      query,
      requestId,
      requestedAt,
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async exportSecret(input: VaultExportSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:${input.alias}:export_secret`;
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      alias: input.alias,
    }));
    return this._vault.exportSecret({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._identity.identityId,
      },
      alias: input.alias,
      requestId,
      requestedAt,
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async registerAgent(input: VaultRegisterAgentInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:${input.agentId}:register_agent_identity`;
    const agentIdentity = {
      vaultId: this._vault.vaultId,
      agentId: input.agentId,
      publicKey: input.publicKey,
    };
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      agentIdentity,
    }));
    await this._vault.registerAgentIdentity({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identity.identityId,
      },
      agentIdentity,
      requestedAt,
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async grantCapability(input: VaultGrantCapabilityInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:${input.capability.capabilityId}:register_capability`;
    const capability = {
      ...input.capability,
      vaultId: this._vault.vaultId,
    };
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      capability,
    }));
    await this._vault.registerCapability({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identity.identityId,
      },
      capability,
      requestedAt,
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async registerFlow(input: VaultRegisterFlowInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:${input.flowId}:register_custom_flow`;
    const flow = {
      flowId: input.flowId,
      mode: input.mode,
      targetUrl: input.targetUrl,
      method: input.method,
      responseVisibility: input.responseVisibility,
      responseSecret: input.responseSecret,
    };
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      flow,
    }));
    await this._vault.registerCustomFlow({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identity.identityId,
      },
      flow,
      requestedAt,
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async deleteSecret(input: VaultDeleteSecretInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:${input.alias}:delete_secret`;
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      alias: input.alias,
    }));
    await this._vault.deleteSecret({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identity.identityId,
      },
      alias: input.alias,
      requestedAt,
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async listAgents(input: VaultListAgentsInput = {}) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:list_agents`;
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
    }));
    return this._vault.listAgents({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      actor: {
        kind: "owner",
        id: this._identity.identityId,
      },
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async listCapabilities(input: VaultListCapabilitiesInput = {}) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:list_capabilities`;
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      agentId: input.agentId ?? null,
    }));
    return this._vault.listCapabilities({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      actor: {
        kind: "owner",
        id: this._identity.identityId,
      },
      agentId: input.agentId,
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async revokeCapability(input: VaultRevokeCapabilityInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:revoke_capability`;
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      agentId: input.agentId,
      capabilityId: input.capabilityId,
    }));
    return this._vault.revokeCapability({
      vaultId: this._vault.vaultId,
      requestId,
      requestedAt,
      owner: {
        kind: "owner",
        id: this._identity.identityId,
      },
      agentId: input.agentId,
      capabilityId: input.capabilityId,
      proof: {
        ownerId: this._identity.identityId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }
}

function isCreateVaultClientOptions(value: unknown): value is CreateVaultClientOptions {
  return typeof value === "object" && value !== null && "ownerIdentity" in value && "vault" in value;
}

function isCreatedIdentity(value: VaultIdentity | CreatedIdentity): value is CreatedIdentity {
  return "privateKey" in value && "publicKey" in value;
}

function resolveVaultSigner(identity: VaultIdentity | CreatedIdentity, signer?: VaultSigner): VaultSigner {
  if (signer) {
    return signer;
  }
  if (isCreatedIdentity(identity)) {
    return new LocalSigner(identity);
  }
  throw new Error("createVaultClient() requires signer when ownerIdentity does not include keys");
}

function resolveVaultIdentity(options: CreateVaultClientOptions): VaultIdentity {
  return {
    identityId: options.ownerIdentity.identityId,
  };
}

/**
 * Creates a {@link VaultClient} instance for a specific vault owner.
 *
 * @param options - Configuration including owner identity and the vault service.
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
    throw new Error("createVaultClient() requires a single options object");
  }
  return new DefaultVaultClient(
    resolveVaultIdentity(options),
    options.vault,
    resolveVaultSigner(options.ownerIdentity, options.signer),
    options.clock ?? new SystemClock(),
  );
}
