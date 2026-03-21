import type { Clock } from "../../vault-core/index.js";
import type {
  AgentCapabilityEnvelope,
  AgentDispatchIntent,
  AgentDispatchTransport,
  AgentSigner,
} from "./contracts.js";

export interface AgentIdentity {
  agentId: string;
}

export interface AgentClient {
  dispatch(intent: AgentDispatchIntent): Promise<import("../../vault-core/index.js").DispatchResult>;
}

function createDispatchBinding(
  requestId: string,
  requestedAt: string,
  agentId: string,
  capabilityId: string,
  secretAlias: string | undefined,
  targetUrl: string,
  method: string,
  body?: string,
): string {
  return JSON.stringify({
    requestId,
    requestedAt,
    agentId,
    capabilityId,
    secretAlias: secretAlias ?? null,
    targetUrl,
    method,
    body: body ?? null,
  });
}

class DefaultAgentClient implements AgentClient {
  constructor(
    private readonly _identity: AgentIdentity,
    private readonly _capability: AgentCapabilityEnvelope,
    private readonly _signer: AgentSigner,
    private readonly _transport: AgentDispatchTransport,
    private readonly _clock: Clock,
  ) {}

  async dispatch(intent: AgentDispatchIntent) {
    const requestedAt = intent.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.agentId}:${requestedAt}:${intent.secretAlias ?? "no-secret"}:${intent.method}`;
    const publicKey = await this._signer.getPublicKey();
    const signature = await this._signer.sign(
      createDispatchBinding(
        requestId,
        requestedAt,
        this._identity.agentId,
        this._capability.capabilityId,
        intent.secretAlias,
        intent.targetUrl,
        intent.method,
        intent.body,
      ),
    );

    return this._transport.dispatch({
      vaultId: this._capability.vaultId,
      requestId,
      requestedAt,
      agent: {
        kind: "agent",
        id: this._identity.agentId,
      },
      capability: {
        vaultId: this._capability.vaultId,
        capabilityId: this._capability.capabilityId,
        agentId: this._capability.agentId,
        secretIds: this._capability.secretIds,
        secretAliases: this._capability.secretAliases,
        operation: this._capability.operation,
        allowedTargets: this._capability.allowedTargets,
        allowedMethods: this._capability.allowedMethods,
        allowedPaths: this._capability.allowedPaths,
        issuedAt: this._capability.issuedAt,
        expiresAt: this._capability.expiresAt,
        revocationVersion: this._capability.revocationVersion,
        rateLimit: this._capability.rateLimit,
        auditRequired: this._capability.auditRequired,
      },
      proof: {
        agentId: this._identity.agentId,
        signature,
        requestId,
        requestedAt,
      },
      secretAlias: intent.secretAlias,
      targetUrl: intent.targetUrl,
      method: intent.method,
      headers: intent.headers,
      body: intent.body,
    });
  }
}

export function createAgentClient(
  identity: AgentIdentity,
  capability: AgentCapabilityEnvelope,
  signer: AgentSigner,
  transport: AgentDispatchTransport,
  clock: Clock,
): AgentClient {
  return new DefaultAgentClient(identity, capability, signer, transport, clock);
}
