# Activity Log

## Purpose

Defines the local audit trail for vault-authenticated runtime actions.

This log is runtime-local. It is not a protocol object and is not required to be shared across peers.

## Entry Shape

Each entry must contain:

```json
{
  "ts": 0,
  "action": "fetchWithAuth",
  "secretName": "string",
  "url": "string",
  "method": "GET",
  "success": true
}
```

Required fields:
- `ts`: event timestamp in Unix milliseconds
- `action`: runtime action name
- `secretName`: vault secret involved
- `url`: request URL
- `method`: HTTP method
- `success`: whether the action succeeded

Optional fields:
- `error`: failure message when `success` is `false`

## Defined Actions

Current action names:
- `fetchWithAuth`
- `fetchJsonAndAddSecret`
- `fetchJsonAndUpdateSecret`
- `compareSecret`
- `proveSecret`
- `validateSecret`

## Required Semantics

1. `fetchWithAuth` success and failure attempts must append an activity entry.
2. JSON secret acquisition and rotation success and failure attempts must append an activity entry.
3. Direct admin secret mutation such as `addSecret` is not part of this audit stream.
4. Local compare/proof/validate attempts should append activity entries without exporting plaintext secret values.

## Failure Semantics

If activity log persistence fails:

- `fetchWithAuth` may still throw its primary runtime error
- `fetchJsonAndAddSecret` and `fetchJsonAndUpdateSecret` must return their normal `FetchResult` shape
- those returned results must set `activityLogWriteFailed: true`

The primary operation outcome must not be silently rewritten into a different success/failure class solely because audit persistence failed.

## Compatibility

- Action names are part of the runtime contract.
- Writers may append extra fields, but readers must tolerate unknown fields.

## Non-Goals

- Defining centralized logging
- Defining protocol-visible governance audit records
- Defining retention policy for local log files
