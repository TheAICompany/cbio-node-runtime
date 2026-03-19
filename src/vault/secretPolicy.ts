export function isLoopbackHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isAllowedSecretUrl(url: URL): boolean {
    return url.protocol === 'https:' || (url.protocol === 'http:' && isLoopbackHost(url.hostname));
}

export function normalizeSecretPolicyOrigin(origin: string): string {
    const url = new URL(origin);
    if (!isAllowedSecretUrl(url)) {
        throw new Error(`Secret policy requires HTTPS origin or loopback HTTP for local development. Received: ${origin}`);
    }
    return url.origin;
}
