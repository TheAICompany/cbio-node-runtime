import { LocalSigner } from "../../protocol/crypto.js";
import type { CreatedIdentity } from "../../runtime/identity.js";
import { SystemClock, type Clock } from "../../vault-core/index.js";
import { LocalVaultTransport } from "../../vault-ingress/defaults.js";
import type { VaultService } from "../../vault-ingress/index.js";
import type {
  AgentCapabilityEnvelope,
  AgentDispatchIntent,
  AgentDispatchTransport,
  AgentSigner,
} from "./contracts.js";

export interface AgentIdentity {
  agentId: string;
}

/**
 * A client for agents to perform authorized operations (e.g., dispatch HTTP requests with secrets).
 * This client uses a delegated capability granted by the owner.
 */
export interface AgentClient {
  /**
   * Dispatches a signed request to a target using a vault secret.
   *
   * @param intent - The destination, method, and secret alias to use.
   * @returns The result of the remote operation.
   *
   * @example
   * ```ts
   * const result = await agent.dispatch({
   *   targetUrl: 'https://api.example.com/data',
   *   method: 'POST',
   *   secretAlias: 'api-token',
   *   body: JSON.stringify({ key: 'value' })
   * });
   * ```
   */
  dispatch(intent: AgentDispatchIntent): Promise<import("../../vault-core/index.js").DispatchResult>;
}

export interface CreateAgentClientOptions {
  agentIdentity: CreatedIdentity | AgentIdentity;
  capability: AgentCapabilityEnvelope;
  vault?: VaultService;
  transport?: AgentDispatchTransport;
  signer?: AgentSigner;
  token?: string;
  clock?: Clock;
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
    private readonly _signer: AgentSigner | undefined,
    private readonly _transport: AgentDispatchTransport,
    private readonly _clock: Clock,
    private readonly _token?: string,
  ) {}

  async dispatch(intent: AgentDispatchIntent) {
    const requestedAt = intent.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.agentId}:${requestedAt}:${intent.secretAlias ?? "no-secret"}:${intent.method}`;

    let signature: string | undefined;
    if (this._token) {
      // Use token-based authentication
    } else {
      // Use signature-based authentication
      if (!this._signer) {
        throw new Error("AgentClient: signer required for signature-based authentication when no token is provided");
      }
      signature = await this._signer.sign(
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
    }

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
        requiresApproval: this._capability.requiresApproval,
      },
      proof: {
        agentId: this._identity.agentId,
        signature,
        token: this._token,
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

function isCreateAgentClientOptions(value: unknown): value is CreateAgentClientOptions {
  return typeof value === "object" && value !== null && "agentIdentity" in value && "capability" in value;
}

function isCreatedIdentity(value: AgentIdentity | CreatedIdentity): value is CreatedIdentity {
  return "privateKey" in value && "publicKey" in value;
}

function resolveAgentSigner(options: CreateAgentClientOptions): AgentSigner | undefined {
  if (options.signer) {
    return options.signer;
  }
  if (isCreatedIdentity(options.agentIdentity)) {
    return new LocalSigner(options.agentIdentity);
  }
  if (options.token) {
    return undefined; // No signer needed if token is present
  }
  throw new Error("createAgentClient() requires signer or private key when no session token is provided");
}

function resolveAgentIdentity(options: CreateAgentClientOptions): AgentIdentity {
  return "agentId" in options.agentIdentity
    ? options.agentIdentity
    : { agentId: options.agentIdentity.identityId };
}

function resolveAgentTransport(
  options: CreateAgentClientOptions,
): AgentDispatchTransport {
  if (options.transport) {
    return options.transport;
  }
  if (options.vault) {
    return new LocalVaultTransport(options.vault);
  }
  throw new Error("createAgentClient() requires transport or vault");
}

/**
 * Creates an {@link AgentClient} for a delegated identity.
 *
 * @param options - Configuration including agent identity, capability, and transport.
 * @returns An initialized {@link AgentClient}.
 *
 * @example
 * ```ts
 * const agent = createAgentClient({
 *   agentIdentity,
 *   capability,
 *   vault
 * });
 * ```
 */
export function createAgentClient(options: CreateAgentClientOptions): AgentClient {
  if (!isCreateAgentClientOptions(options)) {
    throw new Error("createAgentClient() requires a single options object");
  }
  return new DefaultAgentClient(
    resolveAgentIdentity(options),
    options.capability,
    resolveAgentSigner(options),
    resolveAgentTransport(options),
    options.clock ?? new SystemClock(),
    options.token,
  );
}
