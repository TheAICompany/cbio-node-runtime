import * as crypto from "node:crypto";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import type { SecretPolicy } from "../vault/vault.js";

export interface LocalSecretIngressWriter {
  addSecret(secretName: string, secretValue: string, options?: SecretPolicy): Promise<void>;
  hasSecret(secretName: string): boolean;
  updateSecret?(secretName: string, secretValue: string): Promise<void>;
}

export interface LocalSecretIngressOptions {
  vault: LocalSecretIngressWriter;
  secretName: string;
  allowedOrigins?: string[];
  overwrite?: boolean;
  host?: string;
  port?: number;
  path?: string;
  authToken?: string;
  once?: boolean;
  maxBodyBytes?: number;
}

export interface LocalSecretIngressResult {
  secretName: string;
}

export interface LocalSecretIngressHandle {
  readonly secretName: string;
  readonly host: string;
  readonly port: number;
  readonly path: string;
  readonly baseUrl: string;
  readonly url: string;
  readonly authToken: string;
  close(): Promise<void>;
  waitForSecret(): Promise<LocalSecretIngressResult>;
}

function normalizeIngressPath(input?: string): string {
  if (!input) return `/cbio/ingest/${crypto.randomBytes(12).toString("hex")}`;
  return input.startsWith("/") ? input : `/${input}`;
}

function isAuthorized(req: http.IncomingMessage, authToken: string): boolean {
  const header = req.headers.authorization;
  if (typeof header === "string" && header === `Bearer ${authToken}`) {
    return true;
  }
  const fallback = req.headers["x-cbio-ingest-token"];
  return typeof fallback === "string" && fallback === authToken;
}

async function readRequestBody(req: http.IncomingMessage, maxBodyBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const next = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    total += next.length;
    if (total > maxBodyBytes) {
      throw new Error("CBIO_LOCAL_SECRET_TOO_LARGE");
    }
    chunks.push(next);
  }
  return Buffer.concat(chunks);
}

function extractSecret(body: Buffer, contentType: string | undefined): string {
  const normalizedType = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (normalizedType === "application/json") {
    const parsed = JSON.parse(body.toString("utf8")) as { secret?: unknown; value?: unknown; token?: unknown };
    const candidate = parsed.secret ?? parsed.value ?? parsed.token;
    if (typeof candidate !== "string" || candidate.length === 0) {
      throw new Error("CBIO_LOCAL_SECRET_MISSING");
    }
    return candidate;
  }

  const value = body.toString("utf8");
  if (!value) {
    throw new Error("CBIO_LOCAL_SECRET_MISSING");
  }
  return value;
}

export async function startLocalSecretIngress(options: LocalSecretIngressOptions): Promise<LocalSecretIngressHandle> {
  const {
    vault,
    secretName,
    allowedOrigins,
    overwrite = false,
    host = "127.0.0.1",
    port = 0,
    path,
    authToken = crypto.randomBytes(24).toString("base64url"),
    once = true,
    maxBodyBytes = 64 * 1024,
  } = options;
  const ingressPath = normalizeIngressPath(path);

  let settled = false;
  let completionResult: LocalSecretIngressResult | null = null;
  let completionError: unknown = null;
  const waiters: Array<{ resolve: (result: LocalSecretIngressResult) => void; reject: (error: unknown) => void }> = [];

  const server = http.createServer(async (req, res) => {
    try {
      if ((req.socket.remoteAddress ?? "") !== host) {
        res.statusCode = 403;
        res.end(JSON.stringify({ error: "CBIO_LOCAL_SECRET_REMOTE_DENIED" }));
        return;
      }

      if ((req.method ?? "GET").toUpperCase() !== "POST" || (req.url ?? "/") !== ingressPath) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "CBIO_LOCAL_SECRET_NOT_FOUND" }));
        return;
      }

      if (!isAuthorized(req, authToken)) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "CBIO_LOCAL_SECRET_UNAUTHORIZED" }));
        return;
      }

      if (settled && once) {
        res.statusCode = 409;
        res.end(JSON.stringify({ error: "CBIO_LOCAL_SECRET_ALREADY_CONSUMED" }));
        return;
      }

      const body = await readRequestBody(req, maxBodyBytes);
      const secretValue = extractSecret(body, req.headers["content-type"]);

      if (vault.hasSecret(secretName)) {
        if (!overwrite || !vault.updateSecret) {
          res.statusCode = 409;
          res.end(JSON.stringify({ error: "CBIO_LOCAL_SECRET_ALREADY_EXISTS" }));
          return;
        }
        await vault.updateSecret(secretName, secretValue);
      } else {
        await vault.addSecret(secretName, secretValue, { allowedOrigins });
      }

      settled = true;
      completionResult = { secretName };
      for (const waiter of waiters.splice(0)) {
        waiter.resolve(completionResult);
      }

      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, secretName }));

      if (once) {
        setImmediate(() => {
          server.close();
        });
      }
    } catch (error) {
      if (!settled && completionError == null) {
        completionError = error;
        for (const waiter of waiters.splice(0)) {
          waiter.reject(error);
        }
      }
      const code = error instanceof Error ? error.message : "CBIO_LOCAL_SECRET_INGEST_FAILED";
      res.statusCode = code === "CBIO_LOCAL_SECRET_TOO_LARGE" ? 413 : 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: code }));
    }
  });

  server.on("close", () => {
    if (!settled && completionError == null) {
      completionError = new Error("CBIO_LOCAL_SECRET_INGRESS_CLOSED");
      for (const waiter of waiters.splice(0)) {
        waiter.reject(completionError);
      }
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
    throw new Error("Failed to determine local secret ingress address.");
  }

  const resolvedAddress = address as AddressInfo;
  const baseUrl = `http://${host}:${resolvedAddress.port}`;
  const url = `${baseUrl}${ingressPath}`;

  return {
    secretName,
    host,
    port: resolvedAddress.port,
    path: ingressPath,
    baseUrl,
    url,
    authToken,
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
    waitForSecret() {
      if (completionResult) {
        return Promise.resolve(completionResult);
      }
      if (completionError != null) {
        return Promise.reject(completionError);
      }
      return new Promise<LocalSecretIngressResult>((resolve, reject) => {
        waiters.push({ resolve, reject });
      });
    },
  };
}
