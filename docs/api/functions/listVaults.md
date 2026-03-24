[**CBIO Node Runtime Agent API v1.46.0**](../README.md)

***

# Function: listVaults()

> **listVaults**(`storage`): `Promise`\<`string`[]\>

Lists all available vaults in the workspace by scanning for signed profiles.

## Parameters

### storage

[`IStorageProvider`](../interfaces/IStorageProvider.md)

The root workspace storage provider.

## Returns

`Promise`\<`string`[]\>

A list of vault IDs and their public discovery metadata.
