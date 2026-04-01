[**CBIO Node Runtime Agent API v1.76.1**](../README.md)

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

### operating\_rules?

> `optional` **operating\_rules?**: readonly `string`[]

***

### product\_intro?

> `optional` **product\_intro?**: `string`

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

***

### what\_you\_can\_do?

> `optional` **what\_you\_can\_do?**: readonly `string`[]
