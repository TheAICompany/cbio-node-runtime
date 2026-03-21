import type { Clock } from "../../vault-core/index.js";
import type { VaultService } from "../../vault-ingress/index.js";
import type {
  OwnerAuditQueryInput,
  OwnerExportSecretInput,
  OwnerRegisterCapabilityInput,
  OwnerRegisterCustomHttpFlowInput,
  OwnerRegisterAgentIdentityInput,
  OwnerRegisterOwnerIdentityInput,
  OwnerWriteSecretInput,
} from "./contracts.js";

export interface OwnerIdentity {
  ownerId: string;
}

export interface OwnerSigner {
  getPublicKey(): Promise<string>;
  sign(input: string): Promise<string>;
}

export interface OwnerClient {
  writeSecret(input: OwnerWriteSecretInput): Promise<import("../../vault-core/index.js").SecretRecord>;
  exportSecret(input: OwnerExportSecretInput): Promise<import("../../vault-core/index.js").OwnerSecretExport>;
  registerCapability(input: OwnerRegisterCapabilityInput): Promise<void>;
  getAudit(query?: OwnerAuditQueryInput): Promise<readonly import("../../vault-core/index.js").AuditEntry[]>;
  registerAgentIdentity(input: OwnerRegisterAgentIdentityInput): Promise<void>;
  registerOwnerIdentity(input: OwnerRegisterOwnerIdentityInput): Promise<void>;
  registerCustomFlow(input: OwnerRegisterCustomHttpFlowInput): Promise<void>;
}

class DefaultOwnerClient implements OwnerClient {
  constructor(
    private readonly _identity: OwnerIdentity,
    private readonly _vault: VaultService,
    private readonly _signer: OwnerSigner,
    private readonly _clock: Clock,
  ) {}

  async writeSecret(input: OwnerWriteSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.ownerId}:${requestedAt}:${input.alias}:write_secret`;
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.ownerId,
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
        id: this._identity.ownerId,
      },
      alias: input.alias,
      plaintext: input.plaintext,
      targetBindings: input.targetBindings,
      requestedAt,
      proof: {
        ownerId: this._identity.ownerId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async getAudit(query: OwnerAuditQueryInput = {}) {
    const requestedAt = this._clock.nowIso();
    const requestId = `${this._identity.ownerId}:${requestedAt}:read_audit`;
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.ownerId,
      query,
    }));
    return this._vault.readAudit({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._identity.ownerId,
      },
      query,
      requestId,
      requestedAt,
      proof: {
        ownerId: this._identity.ownerId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async exportSecret(input: OwnerExportSecretInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.ownerId}:${requestedAt}:${input.alias}:export_secret`;
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.ownerId,
      alias: input.alias,
    }));
    return this._vault.exportSecret({
      vaultId: this._vault.vaultId,
      actor: {
        kind: "owner",
        id: this._identity.ownerId,
      },
      alias: input.alias,
      requestId,
      requestedAt,
      proof: {
        ownerId: this._identity.ownerId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async registerAgentIdentity(input: OwnerRegisterAgentIdentityInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.ownerId}:${requestedAt}:${input.agentId}:register_agent_identity`;
    const agentIdentity = {
      vaultId: this._vault.vaultId,
      agentId: input.agentId,
      publicKey: input.publicKey,
    };
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.ownerId,
      agentIdentity,
    }));
    await this._vault.registerAgentIdentity({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identity.ownerId,
      },
      agentIdentity,
      requestedAt,
      proof: {
        ownerId: this._identity.ownerId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async registerCapability(input: OwnerRegisterCapabilityInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.ownerId}:${requestedAt}:${input.capability.capabilityId}:register_capability`;
    const capability = {
      ...input.capability,
      vaultId: this._vault.vaultId,
    };
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.ownerId,
      capability,
    }));
    await this._vault.registerCapability({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identity.ownerId,
      },
      capability,
      requestedAt,
      proof: {
        ownerId: this._identity.ownerId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async registerOwnerIdentity(input: OwnerRegisterOwnerIdentityInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.ownerId}:${requestedAt}:${input.ownerId}:register_owner_identity`;
    const ownerIdentity = {
      vaultId: this._vault.vaultId,
      ownerId: input.ownerId,
      publicKey: input.publicKey,
    };
    const signature = await this._signer.sign(JSON.stringify({
      requestId,
      requestedAt,
      ownerId: this._identity.ownerId,
      ownerIdentity,
    }));
    await this._vault.registerOwnerIdentity({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identity.ownerId,
      },
      ownerIdentity,
      requestedAt,
      proof: {
        ownerId: this._identity.ownerId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }

  async registerCustomFlow(input: OwnerRegisterCustomHttpFlowInput): Promise<void> {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.ownerId}:${requestedAt}:${input.flowId}:register_custom_flow`;
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
      ownerId: this._identity.ownerId,
      flow,
    }));
    await this._vault.registerCustomFlow({
      vaultId: this._vault.vaultId,
      requestId,
      owner: {
        kind: "owner",
        id: this._identity.ownerId,
      },
      flow,
      requestedAt,
      proof: {
        ownerId: this._identity.ownerId,
        signature,
        requestId,
        requestedAt,
      },
    });
  }
}

export function createOwnerClient(
  identity: OwnerIdentity,
  vault: VaultService,
  signer: OwnerSigner,
  clock: Clock,
): OwnerClient {
  return new DefaultOwnerClient(identity, vault, signer, clock);
}
