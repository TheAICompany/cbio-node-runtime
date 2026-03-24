[**CBIO Node Runtime Agent API v1.45.1**](../README.md)

***

# Interface: CbioRuntime

Main runtime interface.

## Properties

### AgentDispatchHttpTransport

> **AgentDispatchHttpTransport**: *typeof* [`AgentDispatchHttpTransport`](../classes/AgentDispatchHttpTransport.md)

***

### createAgentClient

> **createAgentClient**: (`options`) => [`AgentClient`](AgentClient.md)

Creates an [AgentClient](AgentClient.md) for a delegated identity.

#### Parameters

##### options

[`CreateAgentClientOptions`](CreateAgentClientOptions.md)

Configuration including agent identity, capability, and transport.

#### Returns

[`AgentClient`](AgentClient.md)

An initialized [AgentClient](AgentClient.md).

#### Example

```ts
const agent = createAgentClient({
  agentIdentity,
  capability,
  vault
});
```

***

### createChildIdentity

> **createChildIdentity**: (`storage`, `parentIdentity`, `options`) => `Promise`\<[`ChildIdentity`](ChildIdentity.md)\>

#### Parameters

##### storage

[`IStorageProvider`](IStorageProvider.md)

##### parentIdentity

`string` \| `CreatedIdentity`

##### options?

[`CreateChildIdentityOptions`](CreateChildIdentityOptions.md) = `{}`

#### Returns

`Promise`\<[`ChildIdentity`](ChildIdentity.md)\>

***

### createDefaultVaultCoreDependencies

> **createDefaultVaultCoreDependencies**: (`options`) => `object`

#### Parameters

##### options?

[`CreateDefaultVaultCoreDependenciesOptions`](CreateDefaultVaultCoreDependenciesOptions.md) = `{}`

#### Returns

`object`

##### agentIdentities

> **agentIdentities**: [`InMemoryAgentIdentityRegistry`](../classes/InMemoryAgentIdentityRegistry.md)

##### audit

> **audit**: [`InMemoryAuditLog`](../classes/InMemoryAuditLog.md)

##### capabilities

> **capabilities**: [`InMemoryCapabilityRegistry`](../classes/InMemoryCapabilityRegistry.md)

##### clock

> **clock**: [`SystemClock`](../classes/SystemClock.md)

##### custody

> **custody**: [`InMemorySecretCustody`](../classes/InMemorySecretCustody.md)

##### customFlows

> **customFlows**: [`InMemoryCustomHttpFlowRegistry`](../classes/InMemoryCustomHttpFlowRegistry.md)

##### executor

> **executor**: [`HttpDispatchExecutor`](../classes/HttpDispatchExecutor.md)

##### ids

> **ids**: [`RandomIdGenerator`](../classes/RandomIdGenerator.md)

##### ownerIdentities

> **ownerIdentities**: [`InMemoryOwnerIdentityRegistry`](../classes/InMemoryOwnerIdentityRegistry.md)

##### ownerProofVerifier

> **ownerProofVerifier**: [`SignatureOwnerProofVerifier`](../classes/SignatureOwnerProofVerifier.md)

##### policy

> **policy**: [`DefaultPolicyEngine`](../classes/DefaultPolicyEngine.md)

##### proofVerifier

> **proofVerifier**: [`SignatureAgentProofVerifier`](../classes/SignatureAgentProofVerifier.md)

##### replayGuard

> **replayGuard**: [`InMemoryReplayGuard`](../classes/InMemoryReplayGuard.md)

##### secrets

> **secrets**: [`InMemorySecretRepository`](../classes/InMemorySecretRepository.md)

##### vaultId

> **vaultId**: [`VaultId`](VaultId.md)

***

### createIdentity

> **createIdentity**: (`options?`) => `CreatedIdentity`

Creates a new root identity with a fresh Ed25519 keypair.

#### Parameters

##### options?

[`CreateIdentityOptions`](CreateIdentityOptions.md)

Configuration for the new identity.

#### Returns

`CreatedIdentity`

A CreatedIdentity containing the ID and keys.

#### Example

```ts
const identity = createIdentity({ nickname: 'my-agent' });
console.log(identity.identityId);
```

***

### createOwnerHttpFlowBoundary

> **createOwnerHttpFlowBoundary**: (`boundary`) => [`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md)

#### Parameters

##### boundary

[`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md)

#### Returns

[`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md)

***

### createPersistentVaultCoreDependencies

> **createPersistentVaultCoreDependencies**: (`storage`, `options`) => `object`

#### Parameters

##### storage

[`IStorageProvider`](IStorageProvider.md)

##### options

[`CreatePersistentVaultCoreDependenciesOptions`](CreatePersistentVaultCoreDependenciesOptions.md)

#### Returns

`object`

##### agentIdentities

> **agentIdentities**: [`PersistentVaultAgentIdentityRegistry`](../classes/PersistentVaultAgentIdentityRegistry.md)

##### audit

> **audit**: [`PersistentVaultAuditLog`](../classes/PersistentVaultAuditLog.md)

##### capabilities

> **capabilities**: [`PersistentVaultCapabilityRegistry`](../classes/PersistentVaultCapabilityRegistry.md)

##### capabilityRevocations

> **capabilityRevocations**: [`CapabilityRevocationRegistry`](CapabilityRevocationRegistry.md)

##### clock

> **clock**: [`SystemClock`](../classes/SystemClock.md)

##### custody

> **custody**: [`PersistentVaultSecretCustody`](../classes/PersistentVaultSecretCustody.md)

##### customFlows

> **customFlows**: [`CustomHttpFlowRegistry`](CustomHttpFlowRegistry.md)

##### executor

> **executor**: [`HttpDispatchExecutor`](../classes/HttpDispatchExecutor.md)

##### ids

> **ids**: [`RandomIdGenerator`](../classes/RandomIdGenerator.md)

##### ownerIdentities

> **ownerIdentities**: [`PersistentVaultOwnerIdentityRegistry`](../classes/PersistentVaultOwnerIdentityRegistry.md)

##### ownerProofVerifier

> **ownerProofVerifier**: [`SignatureOwnerProofVerifier`](../classes/SignatureOwnerProofVerifier.md)

##### policy

> **policy**: [`DefaultPolicyEngine`](../classes/DefaultPolicyEngine.md)

##### proofVerifier

> **proofVerifier**: [`SignatureAgentProofVerifier`](../classes/SignatureAgentProofVerifier.md)

##### replayGuard

> **replayGuard**: [`ReplayGuard`](ReplayGuard.md)

##### secrets

> **secrets**: [`PersistentVaultSecretRepository`](../classes/PersistentVaultSecretRepository.md)

##### vaultId

> **vaultId**: [`VaultId`](VaultId.md)

***

### createStandardAcquireBoundary

> **createStandardAcquireBoundary**: (`input`) => [`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md)

#### Parameters

##### input

###### method?

`string`

###### responseField

`"access_token"` \| `"refresh_token"` \| `"id_token"`

###### storeAlias

`string`

###### targetUrl

`string`

#### Returns

[`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md)

***

### createStandardDispatchBoundary

> **createStandardDispatchBoundary**: (`input`) => [`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md)

#### Parameters

##### input

###### method

`string`

###### targetUrl

`string`

#### Returns

[`OwnerHttpFlowBoundary`](OwnerHttpFlowBoundary.md)

***

### createVault

> **createVault**: \{(`storage`, `options`): `Promise`\<[`CreatedVault`](CreatedVault.md)\>; (`options`): `Promise`\<[`CreatedVault`](CreatedVault.md)\>; \}

#### Call Signature

> (`storage`, `options`): `Promise`\<[`CreatedVault`](CreatedVault.md)\>

Creates and bootstraps a new persistent vault.

##### Parameters

###### storage

`string` \| [`IStorageProvider`](IStorageProvider.md)

Workspace storage (or path string) where vaults are stored.

###### options

[`CreateVaultOptions`](CreateVaultOptions.md)

Configuration including owner identity and metadata.

##### Returns

`Promise`\<[`CreatedVault`](CreatedVault.md)\>

A [CreatedVault](CreatedVault.md) instance.

##### Example

```ts
const vault = await createVault({
  ownerIdentity,
  nickname: 'production-secrets'
});
```

#### Call Signature

> (`options`): `Promise`\<[`CreatedVault`](CreatedVault.md)\>

Creates a new vault using the default workspace storage.

##### Parameters

###### options

[`CreateVaultOptions`](CreateVaultOptions.md)

Configuration for the new vault.

##### Returns

`Promise`\<[`CreatedVault`](CreatedVault.md)\>

***

### createVaultClient

> **createVaultClient**: (`options`) => [`VaultClient`](VaultClient.md)

Creates a [VaultClient](VaultClient.md) instance for a specific vault owner.

#### Parameters

##### options

[`CreateVaultClientOptions`](CreateVaultClientOptions.md)

Configuration including owner identity and the vault service.

#### Returns

[`VaultClient`](VaultClient.md)

An initialized [VaultClient](VaultClient.md).

#### Example

```ts
const client = createVaultClient({
  ownerIdentity,
  vault
});
```

***

### createVaultCore

> **createVaultCore**: (`deps`) => [`VaultCore`](VaultCore.md)

#### Parameters

##### deps

[`VaultCoreDependencies`](VaultCoreDependencies.md)

#### Returns

[`VaultCore`](VaultCore.md)

***

### createVaultService

> **createVaultService**: (`deps`, `options`) => [`VaultService`](VaultService.md)

#### Parameters

##### deps

[`VaultCoreDependencies`](VaultCoreDependencies.md)

##### options?

###### clock?

[`Clock`](Clock.md)

###### customFlows?

[`VaultCustomFlowResolver`](VaultCustomFlowResolver.md)

###### fetchImpl?

\{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

#### Returns

[`VaultService`](VaultService.md)

***

### deriveChildIdentity

> **deriveChildIdentity**: (`parent`, `childIndex`, `options`) => [`ChildIdentity`](ChildIdentity.md)

Deterministically derives a child identity from a parent's private key and an index.

#### Parameters

##### parent

`string` \| `CreatedIdentity`

The parent identity object or its private key string.

##### childIndex

`number`

A non-negative integer for derivation.

##### options?

[`DeriveIdentityOptions`](DeriveIdentityOptions.md) = `{}`

Optional nickname for the child.

#### Returns

[`ChildIdentity`](ChildIdentity.md)

A [ChildIdentity](ChildIdentity.md) with derivation metadata.

#### Example

```ts
const child = deriveChildIdentity(parentIdentity, 0, { nickname: 'sub-agent-0' });
```

***

### deriveVaultWorkingKey

> **deriveVaultWorkingKey**: `object`

***

### ensureIdentityPrivateVault

> **ensureIdentityPrivateVault**: (`storage`, `identity`) => `Promise`\<`void`\>

#### Parameters

##### storage

[`IStorageProvider`](IStorageProvider.md)

##### identity

`CreatedIdentity`

#### Returns

`Promise`\<`void`\>

***

### FsStorageProvider

> **FsStorageProvider**: *typeof* [`FsStorageProvider`](../classes/FsStorageProvider.md)

***

### handleVaultHttpDispatch

> **handleVaultHttpDispatch**: (`service`, `body`) => `Promise`\<[`VaultAgentDispatchResponse`](VaultAgentDispatchResponse.md) \| [`VaultAgentDispatchErrorResponse`](VaultAgentDispatchErrorResponse.md)\>

Standard server-side helper to handle a vault agent dispatch request from an HTTP body.
This can be used in any HTTP server framework (Express, Fastify, etc.).

#### Parameters

##### service

[`VaultService`](VaultService.md)

The VaultService instance to handle the request.

##### body

`unknown`

The parsed JSON body of the incoming HTTP request.

#### Returns

`Promise`\<[`VaultAgentDispatchResponse`](VaultAgentDispatchResponse.md) \| [`VaultAgentDispatchErrorResponse`](VaultAgentDispatchErrorResponse.md)\>

A JSON-serializable response object.

***

### IdentityError

> **IdentityError**: *typeof* [`IdentityError`](../classes/IdentityError.md)

***

### IdentityErrorCode

> **IdentityErrorCode**: *typeof* [`IdentityErrorCode`](../enumerations/IdentityErrorCode.md)

***

### initializeVaultCustody

> **initializeVaultCustody**: (`storage`, `options`) => `Promise`\<[`InitializedVaultCustody`](InitializedVaultCustody.md)\>

#### Parameters

##### storage

[`IStorageProvider`](IStorageProvider.md)

##### options?

[`InitializeVaultCustodyOptions`](InitializeVaultCustodyOptions.md) = `{}`

#### Returns

`Promise`\<[`InitializedVaultCustody`](InitializedVaultCustody.md)\>

***

### listIdentities

> **listIdentities**: (`storage`) => `Promise`\<`any`[]\>

Lists all identities in the workspace with their discovery metadata.

#### Parameters

##### storage

[`IStorageProvider`](IStorageProvider.md)

#### Returns

`Promise`\<`any`[]\>

***

### listVaults

> **listVaults**: (`storage`) => `Promise`\<`object`[]\>

Lists all available vaults in the workspace by scanning for signed profiles.

#### Parameters

##### storage

[`IStorageProvider`](IStorageProvider.md)

The root workspace storage provider.

#### Returns

`Promise`\<`object`[]\>

A list of vault IDs and their public discovery metadata.

***

### LocalSigner

> **LocalSigner**: *typeof* [`LocalSigner`](../classes/LocalSigner.md)

***

### LocalVaultTransport

> **LocalVaultTransport**: *typeof* [`LocalVaultTransport`](../classes/LocalVaultTransport.md)

***

### MemoryStorageProvider

> **MemoryStorageProvider**: *typeof* [`MemoryStorageProvider`](../classes/MemoryStorageProvider.md)

***

### PersistentVaultCapabilityRevocationRegistry

> **PersistentVaultCapabilityRevocationRegistry**: *typeof* [`PersistentVaultCapabilityRevocationRegistry`](../classes/PersistentVaultCapabilityRevocationRegistry.md)

***

### readIdentityMetadata

> **readIdentityMetadata**: (`storage`, `identityId`, `privateKey?`) => `Promise`\<`any`\>

Metadata reader for identities.
Discovery info (nickname) can be read with just identityId.
Full profile requires privateKey.

#### Parameters

##### storage

[`IStorageProvider`](IStorageProvider.md)

##### identityId

`string`

##### privateKey?

`string`

#### Returns

`Promise`\<`any`\>

***

### readIdentityPrivateVaultChildrenState

> **readIdentityPrivateVaultChildrenState**: (`storage`, `identityOrPrivateKey`) => `Promise`\<[`IdentityPrivateVaultChildrenState`](IdentityPrivateVaultChildrenState.md)\>

#### Parameters

##### storage

[`IStorageProvider`](IStorageProvider.md)

##### identityOrPrivateKey

[`IdentityPrivateVaultAccess`](../type-aliases/IdentityPrivateVaultAccess.md)

#### Returns

`Promise`\<[`IdentityPrivateVaultChildrenState`](IdentityPrivateVaultChildrenState.md)\>

***

### readIdentityPrivateVaultProfile

> **readIdentityPrivateVaultProfile**: (`storage`, `identityOrPrivateKey`) => `Promise`\<[`IdentityPrivateVaultProfile`](IdentityPrivateVaultProfile.md) \| `null`\>

#### Parameters

##### storage

[`IStorageProvider`](IStorageProvider.md)

##### identityOrPrivateKey

[`IdentityPrivateVaultAccess`](../type-aliases/IdentityPrivateVaultAccess.md)

#### Returns

`Promise`\<[`IdentityPrivateVaultProfile`](IdentityPrivateVaultProfile.md) \| `null`\>

***

### recoverVault

> **recoverVault**: \{(`storage`, `options`): `Promise`\<[`RecoveredVault`](RecoveredVault.md)\>; (`options`): `Promise`\<[`RecoveredVault`](RecoveredVault.md)\>; \}

#### Call Signature

> (`storage`, `options`): `Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

Reopens an existing vault from storage.

##### Parameters

###### storage

`string` \| [`IStorageProvider`](IStorageProvider.md)

Workspace storage where the vault was created.

###### options

[`RecoverVaultOptions`](RecoverVaultOptions.md)

Recovery options (must include `vaultId` and `ownerIdentity`).

##### Returns

`Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

A [RecoveredVault](RecoveredVault.md) instance.

##### Example

```ts
const vault = await recoverVault({
  vaultId: 'vault_123',
  ownerIdentity
});
```

#### Call Signature

> (`options`): `Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

Recovers an existing vault using the default workspace storage.

##### Parameters

###### options

[`RecoverVaultOptions`](RecoverVaultOptions.md)

Recovery options including vaultId and owner identity.

##### Returns

`Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

***

### recoverVaultWorkingKey

> **recoverVaultWorkingKey**: (`storage`, `vaultRecoveryKey`, `storageKey`) => `Promise`\<`string`\>

#### Parameters

##### storage

[`IStorageProvider`](IStorageProvider.md)

##### vaultRecoveryKey

`string`

##### storageKey?

`string` = `DEFAULT_VAULT_KEY_CUSTODY_BLOB_KEY`

#### Returns

`Promise`\<`string`\>

***

### restoreIdentity

> **restoreIdentity**: (`privateKey`, `options`) => `CreatedIdentity`

Restores an identity from an existing private key.

#### Parameters

##### privateKey

`string`

The base64url-encoded PKCS#8 private key.

##### options?

[`RestoreIdentityOptions`](RestoreIdentityOptions.md) = `{}`

Optional metadata to attach to the restored object.

#### Returns

`CreatedIdentity`

The reconstructed CreatedIdentity.

#### Example

```ts
const identity = restoreIdentity('MIIB...');
```

***

### SystemClock

> **SystemClock**: *typeof* [`SystemClock`](../classes/SystemClock.md)

***

### VaultCoreError

> **VaultCoreError**: *typeof* [`VaultCoreError`](../classes/VaultCoreError.md)

***

### wrapVaultCoreAsVaultService

> **wrapVaultCoreAsVaultService**: (`core`, `options`) => [`VaultService`](VaultService.md)

#### Parameters

##### core

[`VaultCore`](VaultCore.md)

##### options?

###### clock?

[`Clock`](Clock.md)

###### customFlows?

[`VaultCustomFlowResolver`](VaultCustomFlowResolver.md)

###### fetchImpl?

\{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

#### Returns

[`VaultService`](VaultService.md)
