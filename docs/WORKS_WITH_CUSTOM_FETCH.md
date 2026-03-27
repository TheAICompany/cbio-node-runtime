# Custom Fetch Notes

This repository no longer exposes the old `CbioIdentity` custom-fetch surface.

In the current first version:
- agent code creates signed dispatch requests through `clients/agent`
- transport goes through `vault-ingress`
- outbound authenticated HTTP is performed inside `vault-core` via `HttpDispatchExecutor`
- `send_secret` dispatch may return response bodies to the agent
- `acquire_secret` does not return raw response values; it returns protocol metadata plus a redacted response shape
- `acquire_secret` currently supports only built-in standard extraction flows, not caller-defined extractors
- owner-defined HTTP request templates are created through `createOwnerHttpFlowBoundary(...)`
- `createStandardAcquireBoundary(...)` and `createStandardDispatchBoundary(...)` derive the two built-in default boundaries
- `custom_http` exists as an owner-defined request-template path with fixed mode/target/method/response visibility

That split is intentional:

- `acquire_secret` treats the response path as sensitive
- `send_secret` treats the downstream HTTP response as standard protocol output after owner approval

If a future SDK-facing custom-fetch helper is added, it must be implemented on top of the current vault-first modules.
