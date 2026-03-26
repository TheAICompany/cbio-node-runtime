# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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

* **Sovereign Vault Architecture**: The administrative model has transitioned from "Identity-centric" to "Authority-centric".
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

* Add agent and capability management APIs including list and revoke, and simplify vault storage initialization. ([7bca236](https://github.com/TheAICompany/cbio-node-runtime/commit/7bca2363f964f54e7fe82a44bfaed79937268f9f))
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
