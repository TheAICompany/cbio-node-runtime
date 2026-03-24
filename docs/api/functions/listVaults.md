[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Function: listVaults()

> **listVaults**(`storage`): `Promise`\<`object`[]\>

Lists all available vaults in the workspace by scanning for signed profiles.

## Parameters

### storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

The root workspace storage provider.

## Returns

`Promise`\<`object`[]\>

A list of vault IDs and their public discovery metadata.
