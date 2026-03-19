# Exposure Surfaces

## Purpose

Documents the currently known secret exposure surfaces that still exist even after the runtime removes public plaintext secret export from its supported flows.

This document is a runtime security inventory, not a protocol object.

## Current Exposure Surfaces

### 1. Root Initialization Window

The root private key may still exist in cleartext during initial generation, import, prompt entry, environment injection, or process startup wiring.

This is currently the primary accepted plaintext bootstrap window.

### 2. Runtime Process Memory

Secrets still exist in runtime memory while they are being:

- acquired
- used for authenticated requests
- compared
- proven
- validated

Memory compromise remains an exposure surface.

### 3. Remote Target Disclosure

When the runtime uses a secret against a remote service, that target service necessarily receives the credential or proof material required for the request.

Examples:

- `fetchWithAuth`
- `startLocalAuthProxy`
- provider-backed validation probes

### 4. Local Ingress Channel

Local secret ingress reduces terminal exposure, but the local handoff channel still exists.

Relevant artifacts include:

- loopback listener state
- one-time ingress token
- local process boundaries

### 5. Secret Operation Oracles

Local KMS-like operations such as compare, proof, and validation are safer than plaintext export, but they still create controlled oracles.

Risk examples:

- repeated compare attempts against low-entropy values
- repeated proof generation against attacker-chosen challenges

### 6. Authority-Held Managed Identity Material

Authority vaults may still contain managed-agent or child-identity private key material as runtime-internal records.

These records are hidden from the public secret namespace, but authority compromise remains a high-impact event.

### 7. Backup and Sealed Export Assets

Sealed vault exports are encrypted, but they remain high-value assets. Their security depends on the external key-encryption-key lifecycle.

### 8. User-Supplied Surrounding Code

The runtime can avoid plaintext export on its own surfaces, but surrounding application code may still leak:

- ingress tokens
- validation metadata
- proofs
- request traces
- root bootstrap material

## Current Mitigations

Implemented mitigations include:

- no public plaintext secret retrieval API
- no public plaintext secret add API
- direct remote acquisition into vault
- local secret ingress instead of terminal handoff
- local compare/proof/validate without plaintext export
- hidden internal record namespace for managed-agent and revocation records
- rate limiting for local compare/proof/validate operations
- audit entries for local compare/proof/validate operations

## Ongoing Hardening Areas

Future hardening should focus on:

- stronger rate limiting and policy controls for local secret oracles
- stricter challenge/purpose rules for proof generation
- tighter handling of authority-held managed identity material
- guidance and tooling for safer bootstrap of the root private key
- clearer backup/KDK operational guidance
