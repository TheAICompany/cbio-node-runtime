import assert from 'node:assert';
import * as http from 'node:http';
import { CbioIdentity, generateIdentityKeys, startLocalAuthProxy } from '../../dist/runtime/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function listen(server, host = '127.0.0.1') {
    try {
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(0, host, () => {
                server.off('error', reject);
                resolve();
            });
        });
        return server.address().port;
    } catch (error) {
        if (error && error.code === 'EPERM') {
            return null;
        }
        throw error;
    }
}

async function run() {
    let capturedAuth = null;
    let capturedPath = null;
    let capturedBody = null;
    let capturedProvider = null;

    const upstream = http.createServer(async (req, res) => {
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        capturedProvider = req.headers['x-cbio-local-proxy'] ?? null;
        capturedAuth = req.headers.authorization ?? req.headers['x-api-key'] ?? null;
        capturedPath = req.url ?? null;
        capturedBody = Buffer.concat(chunks).toString('utf8');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, echoedPath: capturedPath }));
    });

    const upstreamPort = await listen(upstream);
    if (upstreamPort == null) {
        console.log('ℹ️ Skipping local auth proxy test: loopback listen is not permitted in this environment');
        return;
    }
    const upstreamBaseUrl = `http://127.0.0.1:${upstreamPort}`;

    const originalFetch = global.fetch;
    global.fetch = async (input, init) => {
        const url = typeof input === 'string' || input instanceof URL ? input.toString() : input.url;
        if (!url.startsWith('https://api.openai.com') && !url.startsWith('https://api.anthropic.com')) {
            return originalFetch(input, init);
        }
        const rewritten = url
            .replace('https://api.openai.com', upstreamBaseUrl)
            .replace('https://api.anthropic.com', upstreamBaseUrl);
        return originalFetch(rewritten, init);
    };

    const DIR = path.join(process.cwd(), '.cbio_proxy_test_' + Date.now());
    await fs.mkdir(DIR, { recursive: true });
    const originalVaultDir = process.env.C_BIO_VAULT_DIR;
    process.env.C_BIO_VAULT_DIR = DIR;

    let proxy = null;
    try {
        const keys = generateIdentityKeys();
        const identity = await CbioIdentity.load(keys);
        await identity.admin.vault.addSecret('openai', 'sk-test-local-proxy');

        proxy = await startLocalAuthProxy({
            authHandle: identity,
            secretName: 'openai',
            upstreamBaseUrl: 'https://api.openai.com',
        });

        const response = await fetch(`${proxy.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: 'gpt-4.1-mini' }),
        });

        assert.equal(response.status, 200);
        const json = await response.json();
        assert.equal(json.ok, true);
        assert.equal(capturedAuth, 'Bearer sk-test-local-proxy');
        assert.equal(capturedPath, '/v1/chat/completions');
        assert.equal(capturedProvider, '1');
        assert.match(capturedBody ?? '', /gpt-4\.1-mini/);

        console.log('✅ Local auth proxy forwards requests and injects Authorization');

        await identity.admin.vault.addSecret('anthropic', 'anthropic-test-key');
        const anthropicProxy = await startLocalAuthProxy({
            authHandle: identity,
            secretName: 'anthropic',
            upstreamBaseUrl: 'https://api.anthropic.com',
            authHeaderName: 'x-api-key',
            authPrefix: '',
        });
        try {
            capturedAuth = null;
            capturedPath = null;
            capturedBody = null;
            capturedProvider = null;

            const anthropicResponse = await fetch(`${anthropicProxy.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({ model: 'claude-sonnet-4-5' }),
            });

            assert.equal(anthropicResponse.status, 200);
            assert.equal(capturedAuth, 'anthropic-test-key');
            assert.equal(capturedPath, '/v1/messages');
            assert.equal(capturedProvider, '1');
            assert.match(capturedBody ?? '', /claude-sonnet-4-5/);

            console.log('✅ Local auth proxy supports provider-specific auth headers');
        } finally {
            await anthropicProxy.close();
        }
    } finally {
        global.fetch = originalFetch;
        if (proxy) {
            await proxy.close();
        }
        await new Promise((resolve) => upstream.close(() => resolve()));
        await fs.rm(DIR, { recursive: true, force: true });
        process.env.C_BIO_VAULT_DIR = originalVaultDir;
    }
}

run().catch((error) => {
    console.error('❌ Local auth proxy test failed:', error);
    process.exit(1);
});
