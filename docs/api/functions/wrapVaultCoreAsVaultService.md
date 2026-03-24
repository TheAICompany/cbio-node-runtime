[**CBIO Node Runtime Agent API v1.45.5**](../README.md)

***

# Function: wrapVaultCoreAsVaultService()

> **wrapVaultCoreAsVaultService**(`core`, `options?`): [`VaultService`](../interfaces/VaultService.md)

## Parameters

### core

[`VaultCore`](../interfaces/VaultCore.md)

### options?

#### clock?

[`Clock`](../interfaces/Clock.md)

#### customFlows?

[`VaultCustomFlowResolver`](../interfaces/VaultCustomFlowResolver.md)

#### fetchImpl?

\{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

## Returns

[`VaultService`](../interfaces/VaultService.md)
