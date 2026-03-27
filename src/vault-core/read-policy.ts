import type { CapabilityReadPolicy } from "./contracts.js";

const MASKED_VALUE = "******";

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "$") return "$";
  return trimmed.startsWith("$.") ? trimmed.slice(2) : trimmed;
}

function isVisiblePath(path: string, visiblePaths: readonly string[]): boolean {
  if (visiblePaths.includes("$")) return true;
  return visiblePaths.some((visiblePath) => path === visiblePath || path.startsWith(`${visiblePath}.`));
}

function maskJsonValue(value: unknown, visiblePaths: readonly string[], path = ""): unknown {
  if (Array.isArray(value)) {
    return value.map((entry, index) => maskJsonValue(entry, visiblePaths, path ? `${path}.${index}` : `${index}`));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        maskJsonValue(entry, visiblePaths, path ? `${path}.${key}` : key),
      ]),
    );
  }

  const valuePath = path || "$";
  return isVisiblePath(valuePath, visiblePaths) ? value : MASKED_VALUE;
}

export function applyResponseReadPolicy(
  body: string | undefined,
  policy: CapabilityReadPolicy,
): string | undefined {
  if (body === undefined) return body;
  const visiblePaths = policy.paths.map(normalizePath).filter(Boolean);
  if (visiblePaths.includes("$")) return body;

  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(maskJsonValue(parsed, visiblePaths));
  } catch {
    return isVisiblePath("$", visiblePaths) ? body : MASKED_VALUE;
  }
}
