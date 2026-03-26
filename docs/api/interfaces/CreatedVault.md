[**CBIO Node Runtime Agent API v1.47.2**](../README.md)

***

# Interface: CreatedVault

Represents a vault instance with its core logic and service layer.

## Properties

### core

> **core**: [`VaultCore`](../classes/VaultCore.md)

The low-level vault core.

***

### nickname?

> `optional` **nickname?**: `string`

Human-readable nickname.

***

### storage

> **storage**: [`IStorageProvider`](IStorageProvider.md)

The anchored storage provider for this vault.

***

### vault

> **vault**: `VaultService`

The high-level service interface for dispatch and acquisition.
