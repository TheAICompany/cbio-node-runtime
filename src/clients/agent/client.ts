import { createRequestIdValue } from "../../internal/id-factory.js";
import { SystemClock, type Clock } from "../../vault-core/index.js";
import { LocalVaultTransport } from "../../vault-ingress/defaults.js";
import type { VaultService } from "../../vault-ingress/index.js";
import type {
  AgentDispatchIntent,
  AgentDispatchTransport,
  AgentVisibleRequestRecord,
  AgentVisibleSecretRecord,
} from "./contracts.js";

export interface AgentIdentity {
  agentId: string;
}

/**
 * A client for agents to perform authorized operations (e.g., dispatch HTTP requests with secrets).
 * This client uses a session token managed by the owner.
 * Agents can use secrets and request broader access, but they do not directly manage
 * the secret lifecycle inside the vault.
 */
export interface AgentClient {
  /**
   * Dispatches a session-token-authenticated request to a target using a vault secret.
   * If the grant is missing, it will return a PENDING status.
   */
  agentDispatch(intent: AgentDispatchIntent): Promise<import("../../vault-core/index.js").DispatchResult>;
  
  /**
   * List secrets the agent can see, including whether they are granted or not.
   */
  agentListSecrets(): Promise<readonly AgentVisibleSecretRecord[]>;
  
  /**
   * List previous requests sent by this agent.
   */
  agentListRequests(): Promise<readonly AgentVisibleRequestRecord[]>;
  
  /**
   * Get details of a specific request.
   */
  agentGetRequest(requestId: string): Promise<import("../../vault-core/index.js").AgentRequestResult>;
  
  /**
   * Introspects the current runtime environment, providing identity, grants, and a toolbox manifest.
   */
  agentIntrospect(): Promise<import("../../vault-core/index.js").AgentRuntimeManifest>;
}

export interface CreateAgentClientOptions {
  agentIdentity: AgentIdentity | { id: string };
  vault?: VaultService;
  transport?: AgentDispatchTransport;
  token: string;
  clock?: Clock;
}

class DefaultAgentClient implements AgentClient {
  constructor(
    private readonly _identity: AgentIdentity,
    private readonly _transport: AgentDispatchTransport,
    private readonly _clock: Clock,
    private readonly _token: string,
  ) {}

  async agentDispatch(intent: AgentDispatchIntent) {
    const requestedAt = intent.requestedAt ?? this._clock.nowIso();
    const requestId = createRequestIdValue("dispatch");
    const reason = intent.reason.trim();
    if (!reason) {
      throw new Error("agentDispatch requires a non-empty reason for owner review");
    }

    return this._transport.agentDispatch({
      vaultId: { value: "" }, // Will be filled by transport/vault if needed, or ignored if local
      requestId,
      requestedAt,
      agent: {
        kind: "agent",
        id: this._identity.agentId,
      },
      proof: {
        agentId: this._identity.agentId,
        token: this._token,
        requestId,
        requestedAt,
      },
      reason,
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
  ) {
    return {
      agentId: this._identity.agentId,
      token: this._token,
      requestId,
      requestedAt,
    };
  }

  async agentListSecrets() {
    const requestedAt = this._clock.nowIso();
    const requestId = createRequestIdValue("list_secrets");
    return this._transport.agentListSecrets({
      vaultId: { value: "" },
      requestId,
      requestedAt,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt),
    });
  }

  async agentIntrospect() {
    const requestedAt = this._clock.nowIso();
    const requestId = createRequestIdValue("get_manifest");
    return this._transport.agentGetRuntimeManifest({
      vaultId: { value: "" },
      requestId,
      requestedAt,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt),
    });
  }

  async agentListRequests() {
    const requestedAt = this._clock.nowIso();
    const requestId = createRequestIdValue("list_requests");
    return this._transport.agentListRequests({
      vaultId: { value: "" },
      requestId,
      requestedAt,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt),
    });
  }

  async agentGetRequest(targetRequestId: string) {
    const requestedAt = this._clock.nowIso();
    const requestId = createRequestIdValue("read_request_result");
    return this._transport.agentGetRequest({
      vaultId: { value: "" },
      requestId,
      requestedAt,
      targetRequestId,
      agent: { kind: "agent", id: this._identity.agentId },
      proof: await this._createProof(requestId, requestedAt),
    });
  }
}

function resolveAgentIdentity(options: CreateAgentClientOptions): AgentIdentity {
  return "agentId" in options.agentIdentity
    ? options.agentIdentity
    : { agentId: (options.agentIdentity as any).id };
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
 */
export function createAgentClient(options: CreateAgentClientOptions): AgentClient {
  return new DefaultAgentClient(
    resolveAgentIdentity(options),
    resolveAgentTransport(options),
    options.clock ?? new SystemClock(),
    options.token,
  );
}
