# Secret Origin Policy

## Purpose

Defines the runtime policy for secrets acquired from remote endpoints and for later rotation of those secrets.

## URL Acceptance

An acquisition or rotation URL is allowed only if:
- it uses `https:`, or
- it uses `http:` with a loopback host for local development

Loopback hosts include:
- `localhost`
- `127.0.0.1`
- `[::1]`

Non-loopback plain HTTP must be rejected.

## Acquisition Semantics

When a secret is fetched from a remote endpoint and stored:

1. If the caller does not provide `allowedOrigins`, the stored secret policy must default to the fetch URL origin.
2. If the requested secret name already exists, the runtime must allocate a unique name by suffixing `_N` where `N` starts at `1`.
3. The returned payload must not leak the extracted secret value in cleartext.

## Rotation Semantics

When a secret is rotated from a remote endpoint:

1. The rotation source origin must be allowed by the existing secret policy.
2. If no origin policy exists for the secret, rotation must fail with `SECRET_POLICY_REQUIRED`.
3. If the fetch origin is not allowed, rotation must fail with `SECRET_SOURCE_ORIGIN_MISMATCH`.
4. A failed rotation must not replace the existing active secret value.

## Normalization

- Origin comparison is performed on normalized origin strings.
- Path, query, and fragment are not part of the policy match.

## Non-Goals

- Defining provider-specific API behavior
- Defining generic HTTP request libraries
- Defining how secret values are used after storage
