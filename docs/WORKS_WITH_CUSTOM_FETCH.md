# Works With SDKs That Support Custom Fetch

This is the recommended integration path for `@the-ai-company/agent-identity-sdk`.

If a provider SDK accepts a custom `fetch`, you can keep the provider's official client and still avoid ever reading the API key in plaintext.

## Why this is the preferred path

- you keep using the provider's official SDK surface
- the vault still injects authentication headers for each request
- agent logic never needs `identity.getSecret(...)`
- the integration stays close to normal provider examples

## General pattern

```ts
const authFetch = agent.createFetchWithAuth('provider-secret-name');

const client = new ProviderSDK({
  fetch: authFetch,
});
```

Use `fetchWithAuth(...)` instead when you do not need the provider SDK at all.

## OpenAI

The official OpenAI JavaScript SDK supports a custom `fetch` function.

```ts
import OpenAI from 'openai';
import { CbioIdentity } from '@the-ai-company/agent-identity-sdk';

const identity = await CbioIdentity.load({
  privateKey: process.env.AGENT_PRIV_KEY!,
});

const agent = identity.getAgent();

const openai = new OpenAI({
  fetch: agent.createFetchWithAuth('openai'),
});

const response = await openai.responses.create({
  model: 'gpt-4.1',
  input: 'Say hello in one sentence.',
});
```

Store the secret under a name like `openai`, then reuse that secret name for all OpenAI requests.

## Anthropic

The official Anthropic TypeScript SDK also supports a custom `fetch` function.

```ts
import Anthropic from '@anthropic-ai/sdk';
import { CbioIdentity } from '@the-ai-company/agent-identity-sdk';

const identity = await CbioIdentity.load({
  privateKey: process.env.AGENT_PRIV_KEY!,
});

const agent = identity.getAgent();

const anthropic = new Anthropic({
  fetch: agent.createFetchWithAuth('anthropic'),
});

const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 256,
  messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
});
```

Use a dedicated secret name such as `anthropic`.

## Other SDKs that support custom fetch

Use the same pattern for any SDK that accepts:

- `fetch`
- a custom HTTP client built on `fetch`
- request options that let you swap the transport layer

The SDK does not need to know anything about Claw-biometric. It only needs to accept a `fetch` implementation.

## If the SDK does not support custom fetch

Do not solve that by calling `identity.getSecret(...)` inside agent logic just to feed a constructor that wants `apiKey: string`.

Use one of these official alternatives instead:

## Option 1: Call the provider API directly

Best when:

- the provider has a normal HTTP API
- you only need a few endpoints
- you want the smallest trusted surface

Example:

```ts
const response = await agent.fetchWithAuth(
  'resend',
  'https://api.resend.com/emails',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'onboarding@example.com',
      to: ['user@example.com'],
      subject: 'Hello',
      html: '<strong>Welcome</strong>',
    }),
  }
);
```

This is the recommended path for SDKs whose official client only accepts a raw API key.

## Option 2: Use a local trusted proxy or broker

Best when:

- your team wants to keep the provider's official SDK
- the SDK only accepts `apiKey: string`
- you want to isolate key use from agent logic

Pattern:

```text
agent/runtime -> local trusted broker -> provider API
```

The agent talks to a local process over HTTP or IPC. The local process holds `identity` privileges or another trusted handle and injects authentication on the outbound request.

With the runtime helper, configure the upstream explicitly:

```ts
const proxy = await startLocalAuthProxy({
  identity: agent,
  secretName: 'openai',
  upstreamBaseUrl: 'https://api.openai.com',
});
```

For providers that do not use `Authorization: Bearer ...`, override the auth settings:

```ts
const proxy = await startLocalAuthProxy({
  identity: agent,
  secretName: 'anthropic',
  upstreamBaseUrl: 'https://api.anthropic.com',
  authHeaderName: 'x-api-key',
  authPrefix: '',
});
```

Common examples:

- OpenAI: `upstreamBaseUrl: 'https://api.openai.com'`
- Anthropic: `upstreamBaseUrl: 'https://api.anthropic.com'`, `authHeaderName: 'x-api-key'`, `authPrefix: ''`
- Resend: `upstreamBaseUrl: 'https://api.resend.com'`

## Option 3: Run key-holding code in a separate trusted process

Best when:

- you already have a worker/service boundary
- you need the provider SDK exactly as-is
- you want process-level separation without introducing a local HTTP proxy

Pattern:

1. trusted process loads `AGENT_PRIV_KEY`
2. trusted process creates `identity`, then `agent`
3. untrusted process calls into the trusted process over RPC, IPC, or a queue

The important part is not the transport. The important part is that the untrusted runtime never gets plaintext credentials and never gets `identity`.

## Decision guide

Use this order:

1. If the SDK supports custom `fetch`, use `createFetchWithAuth(...)`.
2. If you only need HTTP calls, use `fetchWithAuth(...)` directly.
3. If the SDK only accepts a raw key, use a trusted proxy or separate trusted process.

Avoid:

- `identity.getSecret(...)` inside agent logic
- passing plaintext API keys into prompts, tools, or third-party SDK constructors
- loading `AGENT_PRIV_KEY` in the same process as untrusted tools or model-driven code
