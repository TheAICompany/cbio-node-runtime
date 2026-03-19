import * as http from "node:http";
import type { AddressInfo } from "node:net";
import type { FetchWithAuthOptions } from "./authClient.js";

export interface FetchWithAuthLike {
  fetchWithAuth(secretName: string, url: string, options?: FetchWithAuthOptions): Promise<Response>;
}

/**
 * Configuration for a local proxy that forwards requests to one upstream API
 * while injecting a vault-backed secret into each outbound request.
 */
export interface LocalAuthProxyOptions {
  /** Trusted handle used to send authenticated requests upstream. */
  identity: FetchWithAuthLike;
  /** Vault secret name to inject into the outbound auth header. */
  secretName: string;
  /** Upstream API base URL, such as `https://api.openai.com`. */
  upstreamBaseUrl: string;
  /** HTTP header name for auth. Defaults to `Authorization`. */
  authHeaderName?: string;
  /** Prefix prepended before the secret value. Defaults to `Bearer `. */
  authPrefix?: string;
  /** Local bind host for the proxy server. Defaults to `127.0.0.1`. */
  host?: string;
  /** Local bind port. Defaults to `0` for an ephemeral port. */
  port?: number;
}

export interface LocalAuthProxyHandle {
  readonly secretName: string;
  readonly upstreamBaseUrl: string;
  readonly host: string;
  readonly port: number;
  readonly baseUrl: string;
  close(): Promise<void>;
}

function normalizeProxyRequestHeaders(headers: http.IncomingHttpHeaders): Headers {
  const next = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "content-length" || lower === "connection" || lower === "authorization") {
      continue;
    }
    if (Array.isArray(value)) {
      next.set(key, value.join(", "));
    } else {
      next.set(key, value);
    }
  }
  next.set("x-cbio-local-proxy", "1");
  return next;
}

async function readRequestBody(req: http.IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks);
}

export async function startLocalAuthProxy(options: LocalAuthProxyOptions): Promise<LocalAuthProxyHandle> {
  const {
    identity,
    secretName,
    upstreamBaseUrl,
    authHeaderName = "Authorization",
    authPrefix = "Bearer ",
    host = "127.0.0.1",
    port = 0,
  } = options;
  const upstream = new URL(upstreamBaseUrl);

  const server = http.createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const targetUrl = new URL(req.url ?? "/", upstream);
      const headers = normalizeProxyRequestHeaders(req.headers);
      const body = await readRequestBody(req);

      const upstreamResponse = await identity.fetchWithAuth(secretName, targetUrl.toString(), {
        method,
        headers,
        body: body ? new Uint8Array(body) : undefined,
        authHeaderName,
        authPrefix,
      });

      res.statusCode = upstreamResponse.status;
      upstreamResponse.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower === "content-length" || lower === "transfer-encoding" || lower === "connection") {
          return;
        }
        res.setHeader(key, value);
      });

      const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
      res.end(responseBuffer);
    } catch (e: any) {
      const message = e instanceof Error ? e.message : String(e);
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "CBIO_LOCAL_PROXY_UPSTREAM_FAILED",
          message,
        }),
      );
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to determine local proxy address.");
  }

  const resolvedAddress = address as AddressInfo;
  const baseUrl = `http://${host}:${resolvedAddress.port}`;

  return {
    secretName,
    upstreamBaseUrl,
    host,
    port: resolvedAddress.port,
    baseUrl,
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
