[**CBIO Node Runtime Agent API v1.68.0**](../README.md)

***

# Interface: CbioRuntime

Main runtime interface.

## Properties

### AgentDispatchHttpTransport

> **AgentDispatchHttpTransport**: *typeof* `AgentDispatchHttpTransport`

***

### createAgentClient

> **createAgentClient**: (`options`) => [`AgentClient`](AgentClient.md)

Creates an [AgentClient](AgentClient.md) for a delegated identity.

#### Parameters

##### options

[`CreateAgentClientOptions`](CreateAgentClientOptions.md)

#### Returns

[`AgentClient`](AgentClient.md)

***

### createIdentity

> **createIdentity**: (`options?`) => `CreatedIdentity`

Creates a new identity with a fresh Ed25519 keypair.

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
console.log(identity.root_agent_id);
```

***

### createOwnerClient

> **createOwnerClient**: (`options`) => `Promise`\<[`OwnerClient`](OwnerClient.md)\>

#### Parameters

##### options

[`CreateOwnerClientOptions`](CreateOwnerClientOptions.md)

#### Returns

`Promise`\<[`OwnerClient`](OwnerClient.md)\>

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

Configuration including password and metadata.

##### Returns

`Promise`\<[`CreatedVault`](CreatedVault.md)\>

A [CreatedVault](CreatedVault.md) instance.

##### Example

```ts
const vault = await createVault({
  password: 'my-strong-password',
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

### createVaultCore

> **createVaultCore**: (`deps`) => [`VaultCore`](../classes/VaultCore.md)

#### Parameters

##### deps

`VaultCoreDependencies`

#### Returns

[`VaultCore`](../classes/VaultCore.md)

***

### createVaultCoreDependencies

> **createVaultCoreDependencies**: (`options`) => `VaultCoreDependencies`

#### Parameters

##### options?

[`VaultCoreDependenciesOptions`](VaultCoreDependenciesOptions.md) = `{}`

#### Returns

`VaultCoreDependencies`

***

### createVaultService

> **createVaultService**: (`authority`, `options?`) => [`VaultService`](VaultService.md)

#### Parameters

##### authority

[`VaultCore`](../classes/VaultCore.md)

##### options?

###### fetchImpl?

\{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

#### Returns

[`VaultService`](VaultService.md)

***

### deriveVaultWorkingKeyFromPassword

> **deriveVaultWorkingKeyFromPassword**: (`password`, `vault_id`) => `string`

Derives a 256-bit working key from a user password and salt (vault_id).
Using scrypt for memory-hard key derivation to resist brute-force attacks.

#### Parameters

##### password

`string`

##### vault\_id

`string`

#### Returns

`string`

***

### FsStorageProvider

> **FsStorageProvider**: *typeof* `FsStorageProvider`

***

### handleVaultAgentControlHttp

> **handleVaultAgentControlHttp**: (`service`, `body`) => `Promise`\<`VaultAgentControlResponse` \| `VaultAgentControlErrorResponse`\>

#### Parameters

##### service

[`VaultService`](VaultService.md)

##### body

`unknown`

#### Returns

`Promise`\<`VaultAgentControlResponse` \| `VaultAgentControlErrorResponse`\>

***

### handleVaultHttpDispatch

> **handleVaultHttpDispatch**: (`service`, `body`) => `Promise`\<`VaultAgentDispatchResponse` \| `VaultAgentDispatchErrorResponse`\>

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

`Promise`\<`VaultAgentDispatchResponse` \| `VaultAgentDispatchErrorResponse`\>

A JSON-serializable response object.

***

### IdentityError

> **IdentityError**: *typeof* [`IdentityError`](../classes/IdentityError.md)

***

### IdentityErrorCode

> **IdentityErrorCode**: *typeof* [`IdentityErrorCode`](../enumerations/IdentityErrorCode.md)

***

### listVaults

> **listVaults**: (`storage`) => `Promise`\<`string`[]\>

Lists all available vaults in the workspace.

#### Parameters

##### storage

[`IStorageProvider`](IStorageProvider.md)

The root workspace storage provider.

#### Returns

`Promise`\<`string`[]\>

A list of vault IDs.

***

### LocalSigner

> **LocalSigner**: *typeof* `LocalSigner`

***

### LocalVaultTransport

> **LocalVaultTransport**: *typeof* `LocalVaultTransport`

***

### MemoryStorageProvider

> **MemoryStorageProvider**: *typeof* `MemoryStorageProvider`

***

### openOwnerSession

> **openOwnerSession**: \{(`storage`, `options`): [`OwnerSession`](OwnerSession.md); (`options`): [`OwnerSession`](OwnerSession.md); \}

#### Call Signature

> (`storage`, `options`): [`OwnerSession`](OwnerSession.md)

##### Parameters

###### storage

`string` \| [`IStorageProvider`](IStorageProvider.md)

###### options

[`OpenOwnerSessionOptions`](OpenOwnerSessionOptions.md)

##### Returns

[`OwnerSession`](OwnerSession.md)

#### Call Signature

> (`options`): [`OwnerSession`](OwnerSession.md)

##### Parameters

###### options

[`OpenOwnerSessionOptions`](OpenOwnerSessionOptions.md)

##### Returns

[`OwnerSession`](OwnerSession.md)

***

### OwnerClientError

> **OwnerClientError**: *typeof* [`OwnerClientError`](../classes/OwnerClientError.md)

***

### OwnerClientErrorCode

> **OwnerClientErrorCode**: *typeof* [`OwnerClientErrorCode`](../enumerations/OwnerClientErrorCode.md)

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

Recovery options (must include `vault_id` and `password`).

##### Returns

`Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

A [RecoveredVault](RecoveredVault.md) instance.

##### Example

```ts
const vault = await recoverVault({
  vault_id: 'vault_123',
  password: 'my-strong-password'
});
```

#### Call Signature

> (`options`): `Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

Recovers an existing vault using the default workspace storage.

##### Parameters

###### options

[`RecoverVaultOptions`](RecoverVaultOptions.md)

Recovery options including vault_id and password.

##### Returns

`Promise`\<[`RecoveredVault`](RecoveredVault.md)\>

***

### restoreIdentity

> **restoreIdentity**: (`private_key`, `options`) => `CreatedIdentity`

Restores an identity from an existing private key.

#### Parameters

##### private\_key

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

> **SystemClock**: *typeof* `SystemClock`

***

### VaultCoreError

> **VaultCoreError**: *typeof* [`VaultCoreError`](../classes/VaultCoreError.md)
