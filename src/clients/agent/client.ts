import type { CreatedIdentity } from "../../runtime/identity.js";
import { createRequestIdValue } from "../../internal/id-factory.js";
import { SystemClock, type Clock } from "../../vault-core/index.js";
import { LocalVaultTransport } from "../../vault-ingress/defaults.js";
import type { VaultService } from "../../vault-ingress/index.js";
import type {
  AgentCapabilityEnvelope,
  AgentDispatchIntent,
  AgentDispatchTransport,
  AgentSubmitCapabilityRequestInput,
  AgentVisibleRequestRecord,
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
  agentListCapabilities(): Promise<readonly import("../../vault-core/index.js").AgentCapabilityState[]>;
  agentListSecrets(): Promise<readonly AgentVisibleSecretRecord[]>;
  agentListRequests(): Promise<readonly AgentVisibleRequestRecord[]>;
  agentGetRequest(requestId: string): Promise<import("../../vault-core/index.js").AgentRequestResult>;
  /**
   * Introspects the current runtime environment, providing identity, capabilities, and a toolbox manifest.
   * Equivalent to '--help' or 'llms.txt' for the agent.
   */
  agentIntrospect(): Promise<import("../../vault-core/index.js").AgentRuntimeManifest>;
  agentSubmitCapabilityRequest(input: AgentSubmitCapabilityRequestInput): Promise<import("../../vault-core/index.js").CapabilityStateRecord>;
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
    const requestId = createRequestIdValue("dispatch");

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
        operation: this._capability.operation,
        customFlowId: this._capability.customFlowId,
        write: this._capability.write,
        read: this._capability.read,
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
    const requestId = createRequestIdValue("list_capabilities");
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
    const requestId = createRequestIdValue("list_secrets");
    return this._transport.agentListSecrets({
      vaultId: this._capability.vaultId,
      requestId,
      requestedAt,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt, "list_secrets"),
    });
  }

  async agentIntrospect() {
    const requestedAt = this._clock.nowIso();
    const requestId = createRequestIdValue("get_manifest");
    return this._transport.agentGetRuntimeManifest({
      vaultId: this._capability.vaultId,
      requestId,
      requestedAt,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt, "get_manifest"),
    });
  }

  async agentListRequests() {
    const requestedAt = this._clock.nowIso();
    const requestId = createRequestIdValue("list_requests");
    return this._transport.agentListRequests({
      vaultId: this._capability.vaultId,
      requestId,
      requestedAt,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt, "list_requests"),
    });
  }

  async agentGetRequest(targetRequestId: string) {
    const requestedAt = this._clock.nowIso();
    const requestId = createRequestIdValue("read_request_result");
    return this._transport.agentGetRequest({
      vaultId: this._capability.vaultId,
      requestId,
      requestedAt,
      targetRequestId,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt, "read_request_result", { targetRequestId }),
    });
  }

  async agentSubmitCapabilityRequest(input: AgentSubmitCapabilityRequestInput) {
    const requestedAt = input.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("submit_capability_request");
    const payload = {
      write: {
        ...input.write,
        secretAliases: input.secretAliases ?? null,
      },
      read: input.read,
      operation: input.operation ?? "dispatch_http",
      justification: input.justification ?? null,
    };
    return this._transport.agentSubmitCapabilityRequest({
      vaultId: this._capability.vaultId,
      requestId,
      requestedAt,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt, "submit_capability_request", payload),
      capability: {
        operation: input.operation ?? "dispatch_http",
        write: {
          scope: input.write.scope,
          methods: [...input.write.methods],
        },
        read: {
          mode: input.read.mode,
          paths: input.read.paths ? [...input.read.paths] : undefined,
        },
      },
      secretAliases: input.secretAliases ? [...input.secretAliases] : undefined,
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
