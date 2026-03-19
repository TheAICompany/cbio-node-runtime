import type { FetchWithAuthOptions } from "./authClient.js";
import type { SecretValidationResult, SecretValidator } from "../agent/agent.js";

export interface GenericHttpSecretValidatorConfig<TData = unknown> {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  isValid?: (response: Response, data: TData | undefined) => boolean;
  classifyStatus?: (response: Response, data: TData | undefined) => SecretValidationResult;
  extractResult?: (response: Response, data: TData | undefined) => Partial<SecretValidationResult>;
}

function defaultStatusResult(response: Response): SecretValidationResult {
  if (response.ok) {
    return { valid: true, status: "valid" };
  }
  if (response.status === 401 || response.status === 403) {
    return { valid: false, status: "invalid", reason: `http_${response.status}` };
  }
  return { valid: false, status: "indeterminate", reason: `http_${response.status}` };
}

async function readJsonIfPresent<TData>(response: Response): Promise<TData | undefined> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return undefined;
  }
  return response.json() as Promise<TData>;
}

export function genericHttpValidator<TData = unknown>(
  config: GenericHttpSecretValidatorConfig<TData>,
): SecretValidator {
  return {
    async validate(handle) {
      const options: FetchWithAuthOptions = {
        method: config.method ?? "GET",
        headers: config.headers,
        body: config.body === undefined ? undefined : JSON.stringify(config.body),
      };
      const response = await handle.fetchWithAuth(config.url, options);
      const data = await readJsonIfPresent<TData>(response);

      if (config.classifyStatus) {
        return config.classifyStatus(response, data);
      }

      const base = defaultStatusResult(response);
      const valid = config.isValid ? config.isValid(response, data) : base.valid;
      const extracted = config.extractResult?.(response, data) ?? {};
      return {
        ...base,
        ...extracted,
        valid,
        status: valid ? "valid" : (base.status === "valid" ? "invalid" : base.status),
      };
    },
  };
}
