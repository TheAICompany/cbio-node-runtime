[**CBIO Node Runtime Agent API v1.74.0**](../README.md)

***

# Interface: AgentRuntimeManifest

## Properties

### agent

> **agent**: `AgentSelfContext`

***

### grants

> **grants**: `object`

#### agent\_secrets

> **agent\_secrets**: readonly [`AgentSecretGrant`](AgentSecretGrant.md)[]

#### secret\_destinations

> **secret\_destinations**: readonly [`SecretDestinationGrant`](SecretDestinationGrant.md)[]

***

### issued\_at

> **issued\_at**: `string`

***

### root\_agent\_id

> **root\_agent\_id**: `string`

***

### tools

> **tools**: readonly `VaultToolDefinition`[]

***

### vault\_id

> **vault\_id**: `string`

***

### vault\_nickname?

> `optional` **vault\_nickname?**: `string`
