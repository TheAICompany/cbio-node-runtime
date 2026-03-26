import type { CreatedIdentity } from "../../runtime/identity.js";
import { SystemClock, type Clock } from "../../vault-core/index.js";
import { LocalVaultTransport } from "../../vault-ingress/defaults.js";
import type { VaultService } from "../../vault-ingress/index.js";
import type {
  AgentCapabilityEnvelope,
  AgentDispatchIntent,
  AgentDispatchTransport,
  AgentSubmitCapabilityRequestInput,
  AgentVisibleSecretRecord,
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
   * Dispatches a session-token-authenticated request to a target using a vault secret.
   *
   * @param intent - The destination, method, and secret alias to use.
   * @returns The result of the remote operation.
   *
   * @example
   * ```ts
   * const result = await agent.agentDispatch({
   *   targetUrl: 'https://api.example.com/data',
   *   method: 'POST',
   *   secretAlias: 'api-token',
   *   body: JSON.stringify({ key: 'value' })
   * });
   * ```
   */
  agentDispatch(intent: AgentDispatchIntent): Promise<import("../../vault-core/index.js").DispatchResult>;
  agentListCapabilities(): Promise<readonly import("../../vault-core/index.js").AgentCapability[]>;
  agentListSecrets(): Promise<readonly AgentVisibleSecretRecord[]>;
  agentSubmitCapabilityRequest(input: AgentSubmitCapabilityRequestInput): Promise<import("../../vault-core/index.js").PendingCapabilityRequestRecord>;
}

export interface CreateAgentClientOptions {
  agentIdentity: CreatedIdentity | AgentIdentity;
  capability: AgentCapabilityEnvelope;
  vault?: VaultService;
  transport?: AgentDispatchTransport;
  token: string;
  clock?: Clock;
}

class DefaultAgentClient implements AgentClient {
  constructor(
    private readonly _identity: AgentIdentity,
    private readonly _capability: AgentCapabilityEnvelope,
    private readonly _transport: AgentDispatchTransport,
    private readonly _clock: Clock,
    private readonly _token: string,
  ) {}

  async agentDispatch(intent: AgentDispatchIntent) {
    const requestedAt = intent.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.agentId}:${requestedAt}:${intent.secretAlias ?? "no-secret"}:${intent.method}`;

    return this._transport.agentDispatch({
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
        scope: this._capability.scope,
        methods: this._capability.methods,
        issuedAt: this._capability.issuedAt,
        expiresAt: this._capability.expiresAt,
        revocationVersion: this._capability.revocationVersion,
        rateLimit: this._capability.rateLimit,
        skipAudit: this._capability.skipAudit,
      },
      proof: {
        agentId: this._identity.agentId,
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

  private async _createProof(
    requestId: string,
    requestedAt: string,
    _action: string,
    _payload: Record<string, unknown> = {},
  ) {
    return {
      agentId: this._identity.agentId,
      token: this._token,
      requestId,
      requestedAt,
    };
  }

  async agentListCapabilities() {
    const requestedAt = this._clock.nowIso();
    const requestId = `${this._identity.agentId}:${requestedAt}:list_capabilities`;
    return this._transport.agentListCapabilities({
      vaultId: this._capability.vaultId,
      requestId,
      requestedAt,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt, "list_capabilities"),
    });
  }

  async agentListSecrets() {
    const requestedAt = this._clock.nowIso();
    const requestId = `${this._identity.agentId}:${requestedAt}:list_secrets`;
    return this._transport.agentListSecrets({
      vaultId: this._capability.vaultId,
      requestId,
      requestedAt,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt, "list_secrets"),
    });
  }

  async agentSubmitCapabilityRequest(input: AgentSubmitCapabilityRequestInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = `${this._identity.agentId}:${requestedAt}:submit_capability_request`;
    const payload = {
      scope: input.scope,
      methods: input.methods,
      operation: input.operation ?? "dispatch_http",
      secretAliases: input.secretAliases ?? [],
      justification: input.justification ?? null,
    };
    return this._transport.agentSubmitCapabilityRequest({
      vaultId: this._capability.vaultId,
      requestId,
      requestedAt,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt, "submit_capability_request", payload),
      scope: {
        operation: input.operation ?? "dispatch_http",
        secretAliases: input.secretAliases ?? [],
        scope: input.scope,
        methods: [...input.methods],
      },
      justification: input.justification,
    });
  }
}

function isCreateAgentClientOptions(value: unknown): value is CreateAgentClientOptions {
  return typeof value === "object" && value !== null && "agentIdentity" in value && "capability" in value;
}

function resolveAgentIdentity(options: CreateAgentClientOptions): AgentIdentity {
  return "agentId" in options.agentIdentity
    ? options.agentIdentity
    : { agentId: options.agentIdentity.identityId };
}

function resolveAgentToken(options: CreateAgentClientOptions): string {
  if (!options.token) {
    throw new Error("createAgentClient() requires a session token; raw private-key execution is not supported");
  }
  return options.token;
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
    resolveAgentTransport(options),
    options.clock ?? new SystemClock(),
    resolveAgentToken(options),
  );
}
