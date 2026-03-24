[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Function: readIdentityMetadata()

> **readIdentityMetadata**(`storage`, `identityId`, `privateKey?`): `Promise`\<`any`\>

Metadata reader for identities.
Discovery info (nickname) can be read with just identityId.
Full profile requires privateKey.

## Parameters

### storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

### identityId

`string`

### privateKey?

`string`

## Returns

`Promise`\<`any`\>
