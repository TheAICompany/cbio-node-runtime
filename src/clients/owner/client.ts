import type { Clock } from "../../vault-core/index.js";
import type { VaultService } from "../../vault-ingress/index.js";
import type {
  VaultAuditQueryInput,
  VaultExportSecretInput,
  VaultGrantCapabilityInput,
  VaultRegisterFlowInput,
  VaultRegisterAgentInput,
  OwnerWriteSecretInput,
} from "./contracts.js";

export interface VaultIdentity {
  identityId: string;
}

export interface VaultSigner {
  getPublicKey(): Promise<string>;
  sign(input: string): Promise<string>;
}

export interface VaultClient {
  writeSecret(input: OwnerWriteSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  exportSecret(input: VaultExportSecretInput): Promise<import("../../vault-core/index.js").OwnerSecretExport>;
  grantCapability(input: VaultGrantCapabilityInput): Promise<void>;
  readAudit(query?: VaultAuditQueryInput): Promise<readonly import("../../vault-core/index.js").AuditEntry[]>;
  registerAgent(input: VaultRegisterAgentInput): Promise<void>;
  registerFlow(input: VaultRegisterFlowInput): Promise<void>;
}

class DefaultVaultClient implements VaultClient {
  constructor(
    private readonly _identity: VaultIdentity,
    private readonly _vault: VaultService,
    private readonly _signer: VaultSigner,
    private readonly _clock: Clock,
  ) {}

  async writeSecret(input: OwnerWriteSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.identityId}:${requestedAt}:${input.alias}:write_secret`;
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.identityId,
      alias: input.alias,
      plaintext: input.plaintext,
      targetBindings: input.targetBindings,
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
      targetBindings: input.targetBindings,
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
}

export function createVaultClient(
  identity: VaultIdentity,
  vault: VaultService,
  signer: VaultSigner,
  clock: Clock,
): VaultClient {
  return new DefaultVaultClient(identity, vault, signer, clock);
}
