/**
 * AuthClient
 *
 * Runtime HTTP client that uses vault-stored secrets for Authorization.
 * Handles fetchWithAuth and createFetchWithAuth. Vault only does storage.
 */

import { createHash } from 'node:crypto';
import { Signer } from '../protocol/crypto.js';
import { IdentityError, IdentityErrorCode } from '../errors.js';
import type { CbioVault } from '../vault/vault.js';
import type { ActivityLogEntry } from '../audit/ActivityLog.js';

export interface FetchWithAuthOptions extends RequestInit {
    authPrefix?: string;
    authHeaderName?: string;
    withSignature?: boolean;
}

async function hashRequestBody(body: BodyInit | null | undefined): Promise<string> {
    if (body == null) return '';
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

    throw new IdentityError(
        IdentityErrorCode.UNSUPPORTED_SIGNED_BODY,
        'withSignature only supports string, URLSearchParams, Blob, ArrayBuffer, and typed array request bodies.'
    );
}

/**
 * AuthClient uses vault's secrets for authenticated HTTP requests.
 * Secret values never leave the vault; AuthClient reads via vault.getSecret.
 */
export class AuthClient {
    constructor(
        private readonly _vault: CbioVault,
        private readonly _signer: Signer | null,
        private readonly _appendActivityLog: (entry: ActivityLogEntry) => Promise<void>
    ) {}

    async fetchWithAuth(secretName: string, url: string, options: FetchWithAuthOptions = {}): Promise<Response> {
        const method = (options.method as string) ?? 'GET';
        const appendFailure = async (error: string): Promise<void> => {
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
            } catch (appendErr) {
                throw new IdentityError(
                    IdentityErrorCode.SECRET_NOT_FOUND,
                    `Secret name '${secretName}' not found in vault.`,
                    { cause: appendErr }
                );
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
        } catch (e: any) {
            try {
                await appendFailure(e.message ?? String(e));
            } catch (appendErr) {
                const msg = e.message ?? String(e);
                if (IdentityError.isIdentityError(e)) {
                    throw new IdentityError(e.code, msg, { cause: appendErr });
                }
                throw new Error(msg, { cause: appendErr });
            }
            throw e;
        }
    }

    createFetchWithAuth(secretName: string): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
        const self = this;
        return async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
            let url: string;
            let options: RequestInit = {};
            if (typeof input === 'string') {
                url = input;
            } else if (input instanceof URL) {
                url = input.toString();
            } else {
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
