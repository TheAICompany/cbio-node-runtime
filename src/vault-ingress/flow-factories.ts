import type { CustomHttpFlowDefinition } from "../vault-core/index.js";

export interface OwnerHttpFlowBoundary {
  mode: "acquire_secret" | "send_secret" | "bidirectional_secret";
  targetUrl: string;
  method: string;
  responseVisibility: "passthrough" | "shape_only";
  responseSecret?: {
    kind: "json_field";
    field: string;
    storeAlias: string;
  };
}

function normalizeMethod(method: string): string {
  const normalized = method.trim().toUpperCase();
  if (!normalized) {
    throw new Error("VAULT_FLOW_METHOD_REQUIRED");
  }
  return normalized;
}

export function createOwnerHttpFlowBoundary(boundary: OwnerHttpFlowBoundary): OwnerHttpFlowBoundary {
  const normalized = {
    ...boundary,
    method: normalizeMethod(boundary.method),
  };
  if (normalized.mode !== "send_secret" && !normalized.responseSecret) {
    throw new Error("VAULT_FLOW_RESPONSE_SECRET_REQUIRED");
  }
  return normalized;
}

export function createStandardAcquireBoundary(input: {
  targetUrl: string;
  method?: string;
  responseField: "access_token" | "refresh_token" | "id_token";
  storeAlias: string;
}): OwnerHttpFlowBoundary {
  return createOwnerHttpFlowBoundary({
    mode: "acquire_secret",
    targetUrl: input.targetUrl,
    method: input.method ?? "POST",
    responseVisibility: "shape_only",
    responseSecret: {
      kind: "json_field",
      field: input.responseField,
      storeAlias: input.storeAlias,
    },
  });
}

export function createStandardDispatchBoundary(input: {
  targetUrl: string;
  method: string;
}): OwnerHttpFlowBoundary {
  return createOwnerHttpFlowBoundary({
    mode: "send_secret",
    targetUrl: input.targetUrl,
    method: input.method,
    responseVisibility: "passthrough",
  });
}

export function toOwnerHttpFlowBoundary(flow: Pick<
  CustomHttpFlowDefinition,
  "mode" | "targetUrl" | "method" | "responseVisibility" | "responseSecret"
>): OwnerHttpFlowBoundary {
  return createOwnerHttpFlowBoundary({
    mode: flow.mode,
    targetUrl: flow.targetUrl,
    method: flow.method,
    responseVisibility: flow.responseVisibility,
    responseSecret: flow.responseSecret,
  });
}
