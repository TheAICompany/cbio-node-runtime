import * as http from "node:http";
import type { AddressInfo } from "node:net";
import { CbioIdentity } from "../impl/agent.js";

export type SupportedProxyProvider = "openai" | "anthropic" | "resend";

const PROVIDER_BASE_URLS: Record<SupportedProxyProvider, string> = {
  openai: "https://api.openai.com",
  anthropic: "https://api.anthropic.com",
  resend: "https://api.resend.com",
};

const PROVIDER_AUTH_CONFIG: Record<SupportedProxyProvider, { authHeaderName: string; authPrefix: string }> = {
  openai: { authHeaderName: "Authorization", authPrefix: "Bearer " },
  anthropic: { authHeaderName: "x-api-key", authPrefix: "" },
  resend: { authHeaderName: "Authorization", authPrefix: "Bearer " },
};

export interface LocalAuthProxyOptions {
  identity: CbioIdentity;
  secretName: string;
  provider: SupportedProxyProvider;
  host?: string;
  port?: number;
}

export interface LocalAuthProxyHandle {
  readonly provider: SupportedProxyProvider;
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
  const { identity, secretName, provider, host = "127.0.0.1", port = 0 } = options;

  const upstreamBaseUrl = PROVIDER_BASE_URLS[provider];
  if (!upstreamBaseUrl) {
    throw new Error(`Unsupported proxy provider: ${provider}`);
  }
  const authConfig = PROVIDER_AUTH_CONFIG[provider];

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
        authHeaderName: authConfig.authHeaderName,
        authPrefix: authConfig.authPrefix,
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
    provider,
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
