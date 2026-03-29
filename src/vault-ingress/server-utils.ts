import type {
  VaultService,
  VaultAgentDispatchRequest,
  VaultAgentDispatchResponse,
  VaultAgentDispatchErrorResponse,
  VaultAgentControlRequest,
  VaultAgentControlResponse,
  VaultAgentControlErrorResponse,
} from "./index.js";
import type {
  AuditOperation,
  OwnerAuditSubscription,
} from "../vault-core/index.js";

export interface VaultAuditSseOptions {
  afterEventId?: string;
  operations?: readonly AuditOperation[];
  root_agent_id?: string;
  request_id?: string;
  signal?: AbortSignal;
  eventName?: string;
  pingIntervalMs?: number;
}

export interface VaultPendingDispatchSseOptions extends Omit<VaultAuditSseOptions, "operations" | "root_agent_id" | "request_id"> {}

function encodeSseFrame(lines: readonly string[]): Uint8Array {
  return new TextEncoder().encode(`${lines.join("\n")}\n\n`);
}

function createSseEventFrame(eventName: string, eventId: string, payload: unknown): Uint8Array {
  return encodeSseFrame([
    `id: ${eventId}`,
    `event: ${eventName}`,
    ...JSON.stringify(payload).split("\n").map((line) => `data: ${line}`),
  ]);
}

function createSseCommentFrame(comment: string): Uint8Array {
  return encodeSseFrame([`: ${comment}`]);
}

/**
 * Standard server-side helper to handle a vault agent dispatch request from an HTTP body.
 * This can be used in any HTTP server framework (Express, Fastify, etc.).
 * 
 * @param service The VaultService instance to handle the request.
 * @param body The parsed JSON body of the incoming HTTP request.
 * @returns A JSON-serializable response object.
 */
export async function handleVaultHttpDispatch(
  service: VaultService,
  body: unknown,
): Promise<VaultAgentDispatchResponse | VaultAgentDispatchErrorResponse> {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: { code: "VAULT_INVALID_REQUEST_BODY", message: "Request body must be a JSON object" },
    };
  }
  const request = body as Partial<VaultAgentDispatchRequest>;
  if (!request.proof?.token) {
    return {
      ok: false,
      error: { code: "VAULT_REMOTE_TOKEN_REQUIRED", message: "Remote agent dispatch requires a session token" },
    };
  }
  return service.agentHandleDispatch(request as VaultAgentDispatchRequest);
}

export async function handleVaultAgentControlHttp(
  service: VaultService,
  body: unknown,
): Promise<VaultAgentControlResponse | VaultAgentControlErrorResponse> {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: { code: "VAULT_INVALID_REQUEST_BODY", message: "Request body must be a JSON object" },
    };
  }
  const request = body as Partial<VaultAgentControlRequest>;
  if (!request.proof?.token) {
    return {
      ok: false,
      error: { code: "VAULT_REMOTE_TOKEN_REQUIRED", message: "Remote agent control requires a session token" },
    };
  }
  return service.agentHandleControl(request as VaultAgentControlRequest);
}

/**
 * Creates an SSE response that streams owner-visible audit entries.
 * Host applications should authenticate owner access before exposing this helper remotely.
 *
 * @param service The VaultService instance to subscribe against.
 * @param options Stream options such as replay cursor, filtering, and abort handling.
 * @returns A streaming SSE Response that emits `audit_entry` events by default.
 */
export function handleVaultAuditSse(
  service: VaultService,
  options: VaultAuditSseOptions = {},
): Response {
  const eventName = options.eventName ?? "audit_entry";
  const pingIntervalMs = options.pingIntervalMs ?? 15000;
  let unsubscribe = () => {};
  let ping: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (ping) {
      clearInterval(ping);
      ping = null;
    }
    unsubscribe();
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = () => {
        if (closed) return;
        cleanup();
        controller.close();
      };

      if (options.signal?.aborted) {
        close();
        return;
      }

      controller.enqueue(createSseCommentFrame("connected"));

      const subscription: OwnerAuditSubscription = {
        afterEventId: options.afterEventId,
        operations: options.operations,
        root_agent_id: options.root_agent_id,
        request_id: options.request_id,
        onEvent: (entry) => {
          if (closed) return;
          controller.enqueue(createSseEventFrame(eventName, entry.event_id, entry));
        },
      };
      unsubscribe = service.ownerOnAudit(subscription);

      if (pingIntervalMs > 0) {
        ping = setInterval(() => {
          if (closed) return;
          controller.enqueue(createSseCommentFrame("ping"));
        }, pingIntervalMs);
        ping.unref?.();
      }

      options.signal?.addEventListener("abort", close, { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/**
 * Creates an SSE response that streams owner-visible pending dispatch events.
 * Host applications should authenticate owner access before exposing this helper remotely.
 *
 * @param service The VaultService instance to subscribe against.
 * @param options Stream options such as replay cursor and abort handling.
 * @returns A streaming SSE Response that emits `pending_dispatch` events.
 */
export function handleVaultPendingDispatchSse(
  service: VaultService,
  options: VaultPendingDispatchSseOptions = {},
): Response {
  const eventName = options.eventName ?? "pending_dispatch";
  const pingIntervalMs = options.pingIntervalMs ?? 15000;
  let unsubscribe = () => {};
  let ping: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (ping) {
      clearInterval(ping);
      ping = null;
    }
    unsubscribe();
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = () => {
        if (closed) return;
        cleanup();
        controller.close();
      };

      if (options.signal?.aborted) {
        close();
        return;
      }

      controller.enqueue(createSseCommentFrame("connected"));

      unsubscribe = service.ownerOnPendingDispatch({
        afterEventId: options.afterEventId,
        onEvent: (event) => {
          if (closed) return;
          controller.enqueue(createSseEventFrame(eventName, event.event_id, event));
        },
      });

      if (pingIntervalMs > 0) {
        ping = setInterval(() => {
          if (closed) return;
          controller.enqueue(createSseCommentFrame("ping"));
        }, pingIntervalMs);
        ping.unref?.();
      }

      options.signal?.addEventListener("abort", close, { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/*
 * Owner remote control is intentionally disabled for now.
 * The original wiring is kept here as a commented stub so it can be restored
 * after owner-side remote authentication is designed and implemented.
 *
 * export async function handleVaultOwnerControlHttp(
 *   service: VaultService,
 *   body: unknown,
 * ): Promise<VaultOwnerControlResponse | VaultOwnerControlErrorResponse> {
 *   if (!body || typeof body !== "object") {
 *     return {
 *       ok: false,
 *       error: { code: "VAULT_INVALID_REQUEST_BODY", message: "Request body must be a JSON object" },
 *     };
 *   }
 *   return service.ownerHandleControl(body as VaultOwnerControlRequest);
 * }
 */
