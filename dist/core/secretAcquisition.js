/**
 * SecretAcquisition
 *
 * Fetches secrets from remote URLs and stores them in vault.
 * Secret never leaves this module; fetch + extract + store is atomic.
 */
import { IdentityError } from '../errors.js';
function isAllowedSecretUrl(url) {
    const isLoopbackHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
    return url.protocol === 'https:' || (url.protocol === 'http:' && isLoopbackHost);
}
function sanitize(obj, secret) {
    if (typeof obj !== 'object' || obj === null)
        return obj;
    const newObj = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value === secret) {
            newObj[key] = '***';
        }
        else if (typeof value === 'object') {
            newObj[key] = sanitize(value, secret);
        }
        else {
            newObj[key] = value;
        }
    }
    return newObj;
}
export class SecretAcquisition {
    _vault;
    _appendActivityLog;
    constructor(_vault, _appendActivityLog) {
        this._vault = _vault;
        this._appendActivityLog = _appendActivityLog;
    }
    async fetchAndAddSecret(options) {
        const { url, method = 'POST', secretName } = options;
        const fail = async (error, code) => {
            try {
                await this._appendActivityLog({
                    ts: Date.now(),
                    action: 'fetchAndAddSecret',
                    secretName,
                    url,
                    method,
                    success: false,
                    error,
                });
            }
            catch {
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
            const data = await response.json();
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
                    action: 'fetchAndAddSecret',
                    secretName: resolvedSecretName,
                    url,
                    method,
                    success: true,
                });
            }
            catch {
                const sanitizedData = sanitize(data, key);
                return { success: true, data: sanitizedData, secretName: resolvedSecretName, activityLogWriteFailed: true };
            }
            const sanitizedData = sanitize(data, key);
            return { success: true, data: sanitizedData, secretName: resolvedSecretName };
        }
        catch (e) {
            const code = IdentityError.isIdentityError(e) ? e.code : undefined;
            return fail(e.message ?? String(e), code);
        }
    }
    async fetchAndUpdateSecret(options) {
        const { url, method = 'POST', secretName } = options;
        const fail = async (error, code) => {
            try {
                await this._appendActivityLog({
                    ts: Date.now(),
                    action: 'fetchAndUpdateSecret',
                    secretName,
                    url,
                    method,
                    success: false,
                    error,
                });
            }
            catch {
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
            const data = await response.json();
            const key = extractKey(data);
            if (!key) {
                return fail("Failed to extract key from response");
            }
            await this._vault.rotateSecret(secretName, key, sourceUrl.origin);
            try {
                await this._appendActivityLog({
                    ts: Date.now(),
                    action: 'fetchAndUpdateSecret',
                    secretName,
                    url,
                    method,
                    success: true,
                });
            }
            catch {
                const sanitizedData = sanitize(data, key);
                return { success: true, data: sanitizedData, secretName, activityLogWriteFailed: true };
            }
            const sanitizedData = sanitize(data, key);
            return { success: true, data: sanitizedData, secretName };
        }
        catch (e) {
            const code = IdentityError.isIdentityError(e) ? e.code : undefined;
            return fail(e.message ?? String(e), code);
        }
    }
}
//# sourceMappingURL=secretAcquisition.js.map