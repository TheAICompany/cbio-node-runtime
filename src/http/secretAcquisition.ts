/**
 * SecretAcquisition
 *
 * Fetches secrets from remote JSON endpoints and stores them in vault.
 * Secret never leaves this module; fetch + extract + store is atomic.
 */

import { IdentityError } from '../errors.js';
import type { CbioVault } from '../vault/vault.js';
import type { ActivityLogEntry } from '../audit/ActivityLog.js';
import { isAllowedSecretUrl } from '../vault/secretPolicy.js';

interface FetchResultBase {
    /** True when the operation succeeded/failed but activity log write failed. Caller gets FetchResult; audit trail may be incomplete. */
    activityLogWriteFailed?: boolean;
}

export interface FetchSuccess<TData = unknown> extends FetchResultBase {
    success: true;
    data: TData;
    secretName: string;
}

export interface FetchFailure extends FetchResultBase {
    success: false;
    error: string;
    code?: string;
}

export type FetchResult<TData = unknown> = FetchSuccess<TData> | FetchFailure;

export interface FetchJsonAndAddSecretOptions<TResponse = unknown, TBody = unknown> {
    secretName: string;
    url: string;
    method?: string;
    headers?: Record<string, string>;
    /** JSON-serializable request body. */
    body?: TBody;
    /** Extract the secret from a parsed JSON response body. */
    extractKey: (response: TResponse) => string;
    allowedOrigins?: string[];
}

export interface FetchJsonAndUpdateSecretOptions<TResponse = unknown, TBody = unknown> {
    secretName: string;
    url: string;
    method?: string;
    headers?: Record<string, string>;
    /** JSON-serializable request body. */
    body?: TBody;
    /** Extract the rotated secret from a parsed JSON response body. */
    extractKey: (response: TResponse) => string;
}

function sanitize(obj: unknown, secret: string): unknown {
    if (typeof obj !== 'object' || obj === null) return obj;
    const newObj: Record<string, unknown> | unknown[] = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value === secret) {
            (newObj as Record<string, unknown>)[key] = '***';
        } else if (typeof value === 'object') {
            (newObj as Record<string, unknown>)[key] = sanitize(value, secret);
        } else {
            (newObj as Record<string, unknown>)[key] = value;
        }
    }
    return newObj;
}

export class SecretAcquisition {
    constructor(
        private readonly _vault: CbioVault,
        private readonly _appendActivityLog: (entry: ActivityLogEntry) => Promise<void>
    ) {}

    hasSecret(secretName: string): boolean {
        return this._vault.hasSecret(secretName);
    }

    listSecretNames(): string[] {
        return this._vault.listSecretNames();
    }

    async fetchJsonAndAddSecret<TResponse = unknown, TBody = unknown>(options: FetchJsonAndAddSecretOptions<TResponse, TBody>): Promise<FetchResult<TResponse>> {
        const { url, method = 'POST', secretName } = options;
        const fail = async (error: string, code?: string): Promise<FetchFailure> => {
            try {
                await this._appendActivityLog({
                    ts: Date.now(),
                    action: 'fetchJsonAndAddSecret',
                    secretName,
                    url,
                    method,
                    success: false,
                    error,
                });
            } catch {
                return { success: false, error, code, activityLogWriteFailed: true };
            }
            return { success: false, error, code };
        };
        try {
            const { headers = {}, body, extractKey, allowedOrigins } = options;
            const sourceUrl = new URL(url);
            if (!isAllowedSecretUrl(sourceUrl)) {
                return fail(`Secret fetch requires HTTPS or loopback HTTP for local development. Received: ${url}`);
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: body ? JSON.stringify(body) : undefined
            });

            if (!response.ok) {
                return fail(`HTTP Error: ${response.status}`);
            }

            const data = await response.json() as TResponse;
            const key = extractKey(data);

            if (!key) {
                return fail("Failed to extract key from response");
            }

            let resolvedSecretName = secretName;
            let suffix = 0;
            while (this._vault.hasSecret(resolvedSecretName)) {
                suffix++;
                resolvedSecretName = `${secretName}_${suffix}`;
            }
            await this._vault.addSecret(resolvedSecretName, key, { allowedOrigins: allowedOrigins ?? [sourceUrl.origin] });

            try {
                await this._appendActivityLog({
                    ts: Date.now(),
                    action: 'fetchJsonAndAddSecret',
                    secretName: resolvedSecretName,
                    url,
                    method,
                    success: true,
                });
            } catch {
                const sanitizedData = sanitize(data, key);
                return { success: true, data: sanitizedData as TResponse, secretName: resolvedSecretName, activityLogWriteFailed: true };
            }

            const sanitizedData = sanitize(data, key);
            return { success: true, data: sanitizedData as TResponse, secretName: resolvedSecretName };
        } catch (e: any) {
            const code = IdentityError.isIdentityError(e) ? e.code : undefined;
            return fail(e.message ?? String(e), code);
        }
    }

    async fetchJsonAndUpdateSecret<TResponse = unknown, TBody = unknown>(options: FetchJsonAndUpdateSecretOptions<TResponse, TBody>): Promise<FetchResult<TResponse>> {
        const { url, method = 'POST', secretName } = options;
        const fail = async (error: string, code?: string): Promise<FetchFailure> => {
            try {
                await this._appendActivityLog({
                    ts: Date.now(),
                    action: 'fetchJsonAndUpdateSecret',
                    secretName,
                    url,
                    method,
                    success: false,
                    error,
                });
            } catch {
                return { success: false, error, code, activityLogWriteFailed: true };
            }
            return { success: false, error, code };
        };
        try {
            const { headers = {}, body, extractKey } = options;
            const sourceUrl = new URL(url);
            if (!isAllowedSecretUrl(sourceUrl)) {
                return fail(`Secret rotation requires HTTPS or loopback HTTP for local development. Received: ${url}`);
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: body ? JSON.stringify(body) : undefined
            });

            if (!response.ok) {
                return fail(`HTTP Error: ${response.status}`);
            }

            const data = await response.json() as TResponse;
            const key = extractKey(data);

            if (!key) {
                return fail("Failed to extract key from response");
            }

            await this._vault.rotateSecret(secretName, key, sourceUrl.origin);

            try {
                await this._appendActivityLog({
                    ts: Date.now(),
                    action: 'fetchJsonAndUpdateSecret',
                    secretName,
                    url,
                    method,
                    success: true,
                });
            } catch {
                const sanitizedData = sanitize(data, key);
                return { success: true, data: sanitizedData as TResponse, secretName, activityLogWriteFailed: true };
            }

            const sanitizedData = sanitize(data, key);
            return { success: true, data: sanitizedData as TResponse, secretName };
        } catch (e: any) {
            const code = IdentityError.isIdentityError(e) ? e.code : undefined;
            return fail(e.message ?? String(e), code);
        }
    }
}
