[**CBIO Node Runtime Agent API v1.63.7**](../README.md)

***

# Interface: AuditEntry

Final audit event structure for Vault actions.

## Properties

### event_id
- **Type**: `string`
- **Description**: Unique identifier for the audit event.

### ts
- **Type**: `string` (ISO 8601)
- **Description**: Timestamp when the event occurred.

### vault_id
- **Type**: `string`
- **Description**: Identifier of the vault where the action occurred.

### actor
- **Type**: `VaultPrincipal`
- **Description**: The principal (owner or agent) performing the action.
- **Fields**:
    - `kind`: `"owner" | "agent"`
    - `id`: `string`

### operation
- **Type**: `AuditOperation`
- **Description**: The specific action performed (e.g., `identity.register`, `secret.dispatch`).

### decision
- **Type**: `"allowed" | "denied"`
- **Description**: Whether the policy engine allowed the operation.

### execution_status
- **Type**: `"not_executed" | "succeeded" | "failed"`
- **Description**: The final status of the operation execution.

### requestId
- **Type**: `string` (Optional)
- **Description**: Correlation ID for dispatch requests.

### alias
- **Type**: `string` (Optional)
- **Description**: The secret alias involved in the operation.

### secretId
- **Type**: `string` (Optional)
- **Description**: The internal secret ID.

### rootAgentId
- **Type**: `string` (Optional)
- **Description**: The root agent ID involved (for identity/grant operations).

### siteId
- **Type**: `string` (Optional)
- **Description**: The destination site ID (for destination grants).

### target
- **Type**: `object` (Optional)
- **Description**: Destination details for dispatch.
- **Fields**:
    - `kind`: `"http" | "other"`
    - `url`: `string`

### detail

***

### rootAgentId?

> `optional` **rootAgentId?**: `string`

***

### secretAlias?

> `optional` **secretAlias?**: `string`

***

### secretId?

> `optional` **secretId?**: `string`

***

### siteId?

> `optional` **siteId?**: `string`

***

### targetUrl?

> `optional` **targetUrl?**: `string`

***

### vaultId

> **vaultId**: [`VaultId`](VaultId.md)
