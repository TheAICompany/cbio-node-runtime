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
  root_agent_id: string;
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
  agentGetRequest(request_id: string): Promise<import("../../vault-core/index.js").AgentRequestResult>;
  
  /**
   * Introspects the current runtime environment, providing identity, grants, and a toolbox manifest.
   */
  agentIntrospect(): Promise<import("../../vault-core/index.js").AgentRuntimeManifest>;
}

export interface CreateAgentClientOptions {
  agentRecord: AgentIdentity | { id: string };
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
    const requested_at = intent.requested_at ?? this._clock.nowIso();
    const request_id = createRequestIdValue("dispatch");
    const reason = intent.reason.trim();
    if (!reason) {
      throw new Error("agentDispatch requires a non-empty reason for owner review");
    }

    return this._transport.agentDispatch({
      vault_id: { value: "" }, // Will be filled by transport/vault if needed, or ignored if local
      request_id,
      requested_at,
      agent: {
        kind: "agent",
        id: this._identity.root_agent_id,
      },
      proof: await this._createProof(request_id, requested_at),
      reason,
      secret_alias: intent.secret_alias,
      target_url: intent.target_url,
      method: intent.method,
      headers: intent.headers,
      body: intent.body,
    });
  }

  private async _createProof(
    request_id: string,
    requested_at: string,
  ) {
    return {
      root_agent_id: this._identity.root_agent_id,
      request_id,
      requested_at,
      token: this._token,
    };
  }

  async agentListSecrets() {
    const requested_at = this._clock.nowIso();
    const request_id = createRequestIdValue("list_secrets");
    return this._transport.agentListSecrets({
      vault_id: { value: "" },
      request_id,
      requested_at,
      agent: { kind: "agent", id: this._identity.root_agent_id },
      proof: await this._createProof(request_id, requested_at),
    });
  }

  async agentIntrospect() {
    const requested_at = this._clock.nowIso();
    const request_id = createRequestIdValue("get_manifest");
    return this._transport.agentGetRuntimeManifest({
      vault_id: { value: "" },
      request_id,
      requested_at,
      agent: { kind: "agent", id: this._identity.root_agent_id },
      proof: await this._createProof(request_id, requested_at),
    });
  }

  async agentListRequests() {
    const requested_at = this._clock.nowIso();
    const request_id = createRequestIdValue("list_requests");
    return this._transport.agentListRequests({
      vault_id: { value: "" },
      request_id,
      requested_at,
      agent: { kind: "agent", id: this._identity.root_agent_id },
      proof: await this._createProof(request_id, requested_at),
    });
  }

  async agentGetRequest(target_request_id: string) {
    const requested_at = this._clock.nowIso();
    const request_id = createRequestIdValue("read_request_result");
    return this._transport.agentGetRequest({
      vault_id: { value: "" },
      request_id,
      requested_at,
      target_request_id,
      agent: { kind: "agent", id: this._identity.root_agent_id },
      proof: await this._createProof(request_id, requested_at),
    });
  }
}

function resolveAgentIdentity(options: CreateAgentClientOptions): AgentIdentity {
  return "root_agent_id" in options.agentRecord
    ? options.agentRecord
    : { root_agent_id: (options.agentRecord as any).id };
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
