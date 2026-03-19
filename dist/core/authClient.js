/**
 * AuthClient
 *
 * Runtime HTTP client that uses vault-stored secrets for Authorization.
 * Handles fetchWithAuth and createFetchWithAuth. Vault only does storage.
 */
import { createHash } from 'node:crypto';
import { IdentityError, IdentityErrorCode } from '../errors.js';
async function hashRequestBody(body) {
    if (body == null)
        return '';
    if (typeof body === 'string') {
        return createHash('sha256').update(body).digest('hex');
    }
    if (body instanceof URLSearchParams) {
        return createHash('sha256').update(body.toString()).digest('hex');
    }
    if (body instanceof ArrayBuffer) {
        return createHash('sha256').update(Buffer.from(body)).digest('hex');
    }
    if (ArrayBuffer.isView(body)) {
        return createHash('sha256')
            .update(Buffer.from(body.buffer, body.byteOffset, body.byteLength))
            .digest('hex');
    }
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
        const bytes = Buffer.from(await body.arrayBuffer());
        return createHash('sha256').update(bytes).digest('hex');
    }
    throw new IdentityError(IdentityErrorCode.UNSUPPORTED_SIGNED_BODY, 'withSignature only supports string, URLSearchParams, Blob, ArrayBuffer, and typed array request bodies.');
}
/**
 * AuthClient uses vault's secrets for authenticated HTTP requests.
 * Secret values never leave the vault; AuthClient reads via vault.getSecret.
 */
export class AuthClient {
    _vault;
    _signer;
    _appendActivityLog;
    constructor(_vault, _signer, _appendActivityLog) {
        this._vault = _vault;
        this._signer = _signer;
        this._appendActivityLog = _appendActivityLog;
    }
    async fetchWithAuth(secretName, url, options = {}) {
        const method = options.method ?? 'GET';
        const appendFailure = async (error) => {
            await this._appendActivityLog({
                ts: Date.now(),
                action: 'fetchWithAuth',
                secretName,
                url,
                method,
                success: false,
                error,
            });
        };
        const secretValue = this._vault.getSecret(secretName);
        if (!secretValue) {
            try {
                await appendFailure(`Secret name '${secretName}' not found in vault.`);
            }
            catch (appendErr) {
                throw new IdentityError(IdentityErrorCode.SECRET_NOT_FOUND, `Secret name '${secretName}' not found in vault.`, { cause: appendErr });
            }
            throw new IdentityError(IdentityErrorCode.SECRET_NOT_FOUND, `Secret name '${secretName}' not found in vault.`);
        }
        const { authPrefix = 'Bearer ', authHeaderName = 'Authorization', withSignature = false, ...fetchOptions } = options;
        const headers = new Headers(fetchOptions.headers || {});
        headers.set(authHeaderName, `${authPrefix}${secretValue}`);
        if (withSignature && this._signer) {
            const timestamp = Date.now().toString();
            const methodUpper = (fetchOptions.method ?? 'GET').toUpperCase();
            const bodyHash = await hashRequestBody(fetchOptions.body);
            const message = `${methodUpper}:${url}:${timestamp}:${bodyHash}`;
            const signature = await this._signer.sign(message);
            headers.set('X-CBIO-Signature', signature);
            headers.set('X-CBIO-Timestamp', timestamp);
        }
        try {
            const response = await fetch(url, {
                ...fetchOptions,
                headers
            });
            await this._appendActivityLog({
                ts: Date.now(),
                action: 'fetchWithAuth',
                secretName,
                url,
                method,
                success: true,
            });
            return response;
        }
        catch (e) {
            try {
                await appendFailure(e.message ?? String(e));
            }
            catch (appendErr) {
                const msg = e.message ?? String(e);
                if (IdentityError.isIdentityError(e)) {
                    throw new IdentityError(e.code, msg, { cause: appendErr });
                }
                throw new Error(msg, { cause: appendErr });
            }
            throw e;
        }
    }
    createFetchWithAuth(secretName) {
        const self = this;
        return async function (input, init) {
            let url;
            let options = {};
            if (typeof input === 'string') {
                url = input;
            }
            else if (input instanceof URL) {
                url = input.toString();
            }
            else {
                const req = input.clone();
                url = req.url;
                options = { method: req.method, headers: req.headers, body: req.body };
            }
            if (init) {
                options = { ...options, ...init };
            }
            return self.fetchWithAuth(secretName, url, options);
        };
    }
}
//# sourceMappingURL=authClient.js.map