[**CBIO Node Runtime Agent API v1.46.0**](../README.md)

***

# Function: wrapVaultCoreAsVaultService()

> **wrapVaultCoreAsVaultService**(`core`, `options?`): `VaultService`

## Parameters

### core

[`VaultCore`](../classes/VaultCore.md)

### options?

#### clock?

`Clock`

#### customFlows?

`VaultCustomFlowResolver`

#### fetchImpl?

\{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

## Returns

`VaultService`
