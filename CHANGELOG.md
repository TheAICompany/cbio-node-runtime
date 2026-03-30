# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.70.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.69.0...v1.70.0) (2026-03-30)


### Features

* add SSE audit streaming support and refine vault owner interfaces ([ec9ebf1](https://github.com/TheAICompany/cbio-node-runtime/commit/ec9ebf168919545f7d9bb6e28a32671a1b8697c5))
* allow updating secret aliases and make plaintext optional in update operations ([07017fa](https://github.com/TheAICompany/cbio-node-runtime/commit/07017fa84cec309410f95b3693b5aeb0118eddc7))

## [1.69.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.68.0...v1.69.0) (2026-03-29)


### Features

* introduce AgentRequestRecord interface and include requested_at and response headers in request tracking ([17b7b6e](https://github.com/TheAICompany/cbio-node-runtime/commit/17b7b6e4bdba70725d13d4a5d34f7cbcb873ad69))

## [1.68.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.67.2...v1.68.0) (2026-03-29)


### Features

* implement root agent activity auditing and add corresponding smoke test ([46d625f](https://github.com/TheAICompany/cbio-node-runtime/commit/46d625f20c3dbff4db5d92fdf7438dfd63294df6))

### [1.67.2](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.67.1...v1.67.2) (2026-03-28)

### [1.67.1](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.67.0...v1.67.1) (2026-03-28)

## [1.67.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.66.0...v1.67.0) (2026-03-28)


### Features

* enhance session token validation with agent-specific ownership checks and add security audit documentation ([3972493](https://github.com/TheAICompany/cbio-node-runtime/commit/3972493c9b45faf70a0dafba03dadad153d83a99))

## [1.66.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.65.0...v1.66.0) (2026-03-28)


### Features

* implement FileSessionTokenRegistry for persistent session token management and update smoke tests ([46727e5](https://github.com/TheAICompany/cbio-node-runtime/commit/46727e5a7173dc209715c791dc2e5ddbbdeeecea))
* implement persistent runtime security with signature verification, replay protection, and HTTP dispatching ([2206ac3](https://github.com/TheAICompany/cbio-node-runtime/commit/2206ac36e02ae106d32e9fe1ea1b401bc182ac51))

## [1.65.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.64.0...v1.65.0) (2026-03-28)


### Features

* rename dispatch statuses to AWAITING_APPROVAL and IN_PROGRESS, and update request tracking to record in-flight dispatches ([5d101c3](https://github.com/TheAICompany/cbio-node-runtime/commit/5d101c3b9848502d9a4e0e649afb7db034c48251))

## [1.64.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.63.8...v1.64.0) (2026-03-28)


### Features

* enforce strict secret creation and enable batch operations for owner secret management ([b1f193d](https://github.com/TheAICompany/cbio-node-runtime/commit/b1f193d48a8b1a54f0393a99df95939cef136f2e))

### [1.63.8](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.63.7...v1.63.8) (2026-03-28)

### [1.63.7](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.63.6...v1.63.7) (2026-03-28)

### [1.63.6](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.63.5...v1.63.6) (2026-03-28)

### [1.63.5](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.63.4...v1.63.5) (2026-03-28)

### Breaking Changes
* **Purged Custom HTTP Flows**: Completely removed the `ownerRegisterFlow` feature and `CustomHttpFlowDefinition` logic to simplify the vault's secret acquisition model.
    * Deleted `VaultRegisterFlowInput` and `CustomHttpFlowRegistry` interfaces.
    * Deleted the helper file `src/vault-ingress/flow-factories.ts`.
    * Simplified `VaultCoreDependencies` by removing Custom Flow support.

### [1.63.4](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.63.3...v1.63.4) (2026-03-28)

### [1.63.3](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.63.2...v1.63.3) (2026-03-27)

### [1.63.2](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.63.1...v1.63.2) (2026-03-27)

### [1.63.1](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.63.0...v1.63.1) (2026-03-27)

## [1.63.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.62.2...v1.63.0) (2026-03-27)


### Features

* Enhance ownerListAgents to include current session tokens for each agent and update related documentation. Refactor session token handling in the VaultCore and ISessionTokenRegistry interfaces. ([c467543](https://github.com/TheAICompany/cbio-node-runtime/commit/c467543cd8459fcfbe4dc28a0095af7cf9a52fcd))

### [1.62.2](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.62.1...v1.62.2) (2026-03-27)

### [1.62.1](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.62.0...v1.62.1) (2026-03-27)

## [1.62.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.61.0...v1.62.0) (2026-03-27)


### Features

* Require justifications for agentDispatch and agentSubmitGrantRequest, enhancing accountability and clarity in request handling. ([47130fe](https://github.com/TheAICompany/cbio-node-runtime/commit/47130febd9af84b8c7868e577c4a6e4f18641745))

## [1.61.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.60.0...v1.61.0) (2026-03-27)


### Features

* Enhance ownerApproveGrantRead method to support custom read policies, updating related documentation and interfaces for improved clarity on read action approvals. ([1b6ad0a](https://github.com/TheAICompany/cbio-node-runtime/commit/1b6ad0a9df6dab9562ff934c99e1171ab87a70b7))

## [1.60.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.59.1...v1.60.0) (2026-03-27)


### Features

* Add owner request management methods for listing and retrieving requests, enhancing API functionality and documentation for improved clarity on request handling. ([46820c9](https://github.com/TheAICompany/cbio-node-runtime/commit/46820c94317483087dee1baa6a748e62daf720f7))

### [1.59.1](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.59.0...v1.59.1) (2026-03-27)

## [1.59.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.58.0...v1.59.0) (2026-03-27)


### Features

* Introduce agent request management with new methods for listing and retrieving request history, enhancing API functionality and documentation for better clarity on request handling. ([c42214b](https://github.com/TheAICompany/cbio-node-runtime/commit/c42214b2a08cfeadb1bf100476579c2bed493da6))

## [1.58.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.57.0...v1.58.0) (2026-03-27)


### Features

* Refactor grant management in API, replacing pending request methods with a unified grant state model, and update documentation to reflect changes in version 1.57.0. ([75d61e0](https://github.com/TheAICompany/cbio-node-runtime/commit/75d61e047ebfdc8469c36a70fce9c3cc9c321b08))

## [1.57.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.56.0...v1.57.0) (2026-03-26)


### Features

* Add owner session management and update API documentation for various interfaces and functions. ([404d9dd](https://github.com/TheAICompany/cbio-node-runtime/commit/404d9dd28fa5f70814885544a74df33910ab932d))

## [1.56.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.55.1...v1.56.0) (2026-03-26)


### Features

* Introduce vault core tool metadata, add owner secret retirement and agent discovery smoke tests, and update client implementations with regenerated API documentation. ([8d8824a](https://github.com/TheAICompany/cbio-node-runtime/commit/8d8824ad532da4a0d650140d144086240eed1d11))

### [1.55.1](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.55.0...v1.55.1) (2026-03-26)

## [1.55.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.54.0...v1.55.0) (2026-03-26)


### Features

* Update runtime, clients, and documentation to v1.54.0. ([08690d6](https://github.com/TheAICompany/cbio-node-runtime/commit/08690d60a9dbf4df4cdc41793dcf5b5dadf2dcd9))

## [1.54.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.53.0...v1.54.0) (2026-03-26)


### Features

* Implement a flat, versioned vault storage layout by removing the nested `vault/sealed/` directory and updating file paths. ([f7460b9](https://github.com/TheAICompany/cbio-node-runtime/commit/f7460b92757d612377df34327f931579b465be8e))
* Update API documentation to v1.53.0 and adjust runtime surface, persistence, and client implementations. ([b468837](https://github.com/TheAICompany/cbio-node-runtime/commit/b46883706a4327f4dae214fec842cf9a7bcfd6eb))

## [1.53.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.52.1...v1.53.0) (2026-03-26)


### Features

* Add owner agent identity update, session token management, and owner client error handling. ([941d3b0](https://github.com/TheAICompany/cbio-node-runtime/commit/941d3b021ed422eef14924af7a89b4f7d93c3f30))

### [1.52.1](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.52.0...v1.52.1) (2026-03-26)

## [1.52.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.51.0...v1.52.0) (2026-03-26)


### Features

* Add owner sensitive action context and vault read agent private key/secret plaintext capabilities, and update `ownerGrantGrant` return type. ([1cb274e](https://github.com/TheAICompany/cbio-node-runtime/commit/1cb274e8b761566191952e4affd59598006a8a8c))

## [1.51.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.50.0...v1.51.0) (2026-03-26)


### Features

* Introduce password-protected sensitive owner actions and new methods for reading secret plaintexts and agent private keys. ([0babc67](https://github.com/TheAICompany/cbio-node-runtime/commit/0babc6797cf7a5f0acc2e5dc813184daf058386c))
* Update API to v1.50.0, modifying `ownerImportAgent` to generate agent IDs upon import. ([a96113c](https://github.com/TheAICompany/cbio-node-runtime/commit/a96113cc63168b162e356c1270812de6eb44b30d))

## [1.50.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.49.0...v1.50.0) (2026-03-26)


### Features

* Introduce agent grant approval and secret listing features, and update documentation. ([a0e9eb2](https://github.com/TheAICompany/cbio-node-runtime/commit/a0e9eb23ae6841da708bab63f8df63ebb6425b25))

## [1.49.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.48.6...v1.49.0) (2026-03-26)


### Features

* Refactor grant granting to use `scope` and `methods` and add grant request workflows. ([7acb59b](https://github.com/TheAICompany/cbio-node-runtime/commit/7acb59bd23bde9944f814ba656db53e8db7f948f))

### [1.48.6](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.48.5...v1.48.6) (2026-03-26)

### [1.48.5](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.48.4...v1.48.5) (2026-03-26)

### [1.48.4](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.48.3...v1.48.4) (2026-03-26)

### [1.48.3](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.48.2...v1.48.3) (2026-03-26)

### [1.48.2](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.48.1...v1.48.2) (2026-03-26)

### [1.48.1](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.48.0...v1.48.1) (2026-03-26)

## [1.48.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.47.2...v1.48.0) (2026-03-26)


### Features

* add agent session token management capabilities and update related contracts. ([d3161bf](https://github.com/TheAICompany/cbio-node-runtime/commit/d3161bfda9e9ca5d7c200461a8e5f783a8dda4e8))

### [1.47.2](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.47.1...v1.47.2) (2026-03-25)

### [1.47.1](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.47.0...v1.47.1) (2026-03-25)

## [1.47.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.46.0...v1.47.0) (2026-03-24)


### Features

### Breaking Changes

* **Vault Architecture**: The administrative model has transitioned from "Identity-centric" to "Authority-centric".
    * Removed `OwnerIdentityRegistry` and `OwnerProofVerifier`.
    * Authority is now granted implicitly via vault unlocking with the master password.
    * Removed `ownerIdentity` parameter from `createVault`, `recoverVault`, and `VaultClient` constructor.
* **Storage Unification**: Consolidated all vault metadata into a single encrypted storage file.
    * Removed `public.sealed`; all discovery metadata (including nicknames) is now stored in `vault/sealed/profile.sealed`.
    * Discovery via `listVaults` now only returns IDs to prevent metadata leaks.
* **Identity Model Simplification**:
    * Removed `ChildIdentity` and deterministic key derivation logic.
    * Deleted `deriveChildIdentity`, `ensureIdentityPrivateVault`, and associated modules.
* **Managed Identity Custody**:
    * Updated `AgentIdentityRecord` to support optional `privateKey` storage for full identity custody within the vault.

### Features

* **Password-based Bootstrap**: Simplified vault creation/recovery using only a master password and storage provider.
* **Managed Custody API**: Added `VaultClient.createAgent()` to generate, register, and store agent identities in one atomic operation.
* **Telemetry & Traceability**: Refactored audit logs to use the `vault-master` principal for all administrative actions.

## [1.46.0](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.45.2...v1.46.0) (2026-03-24)


### Features

* Add API documentation and types for vault, identity, and agent management features. ([0623adc](https://github.com/TheAICompany/cbio-node-runtime/commit/0623adcacf54b29370859b8f9bcb97273b9b3167))

### [1.45.2](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.45.1...v1.45.2) (2026-03-24)

### [1.45.1](https://github.com/TheAICompany/cbio-node-runtime/compare/v1.45.0...v1.45.1) (2026-03-24)

## 1.45.0 (2026-03-24)


### Features

* Add agent and grant management APIs including list and revoke, and simplify vault storage initialization. ([7bca236](https://github.com/TheAICompany/cbio-node-runtime/commit/7bca2363f964f54e7fe82a44bfaed79937268f9f))
* Add functions to list identities and vaults, leveraging new storage provider capabilities. ([d896ac9](https://github.com/TheAICompany/cbio-node-runtime/commit/d896ac92e1a3fc567754ffc713f9df783e7077b8))
* Add secret deletion functionality and transition public metadata to encrypted discovery with anchored storage. ([5b138be](https://github.com/TheAICompany/cbio-node-runtime/commit/5b138be7bcc1cf9178a0709f4df39bc6b5d3c239))
* Allow custom public metadata and ensure owner ID is stored in the vault's public profile. ([4abdad9](https://github.com/TheAICompany/cbio-node-runtime/commit/4abdad905c6ec30fe90ad4abd807f5b9dcee3011))
* Allow exposing vault nickname publicly and optimize private vault profile updates by only writing changes. ([c453861](https://github.com/TheAICompany/cbio-node-runtime/commit/c453861953a642f7510700e19e40f01ca1582d00))
* Encrypt identity private vault data and introduce API to read identity profile and children state. ([2e1ea20](https://github.com/TheAICompany/cbio-node-runtime/commit/2e1ea202ef5c6d8004aec5224ec07611578f6771))
* expose deriveVaultWorkingKey function and bump package version. ([8dac1c1](https://github.com/TheAICompany/cbio-node-runtime/commit/8dac1c147d80a201bcd8274385c0b2376df3a866))
* Implement A/B process isolation architecture for remote secret dispatch, including documentation, examples, and supporting remote transport utilities. ([075261e](https://github.com/TheAICompany/cbio-node-runtime/commit/075261e10d34fe65dfee8d62928f85cc42b55f08))
* Implement canonical JSON stringification for verifiable metadata and add comprehensive signature integrity tests. ([55b1964](https://github.com/TheAICompany/cbio-node-runtime/commit/55b1964a08329bb0d5f2f1b39a63466c07f98c8e))
* Implement dual-area storage (sealed/public) for vaults, separate identity data into `identities/`, and add `publicMetadata` to `createVault`. ([04c38f1](https://github.com/TheAICompany/cbio-node-runtime/commit/04c38f1ca7425da0075bcb8fb30ca157a5274440))
* Implement dual-area storage for vaults and identities, introducing public metadata for discovery. ([06313e4](https://github.com/TheAICompany/cbio-node-runtime/commit/06313e4bd755665815644aaa2b5c45bcf04d81bc))
* Implement unified `readIdentityMetadata` for retrieving public or sealed identity profiles, add public profile mirroring, and update documentation. ([c228876](https://github.com/TheAICompany/cbio-node-runtime/commit/c228876d8c2e64445f15cf7e14ab9039f35bd946))
* Implement verifiable discovery for public vault metadata, ensuring integrity through digital signatures. ([7a8192b](https://github.com/TheAICompany/cbio-node-runtime/commit/7a8192bafa93c192d0e7514f8d8f98ca5de7e9c0))
* Introduce `SealedJsonRepository` for unified sealed JSON persistence and separate public from sealed vault metadata. ([c7c7fae](https://github.com/TheAICompany/cbio-node-runtime/commit/c7c7faed0072f52b8bd68b8d37639bda3d8f0547))
* Introduce canonical JSON stringification for verifiable metadata to ensure stable signatures and update public profile parsing. ([4bcf0ad](https://github.com/TheAICompany/cbio-node-runtime/commit/4bcf0ad60d85a8a290f52293c5feff2631bcd35c))
* Refactor vault creation and recovery to explicitly require a storage provider and introduce a `VaultPublicMetadata` interface. ([b622000](https://github.com/TheAICompany/cbio-node-runtime/commit/b622000b59a14106c66716baedcfd22737698f06))
* Simplify `createVault` and `recoverVault` by adding default workspace storage and introduce `VaultPublicMetadata` for standardized vault discovery. ([5e30443](https://github.com/TheAICompany/cbio-node-runtime/commit/5e304436c740b8c7cbd04930f7010de41b2172d5))
