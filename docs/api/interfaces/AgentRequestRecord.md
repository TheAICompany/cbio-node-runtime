[**CBIO Node Runtime Agent API v1.74.0**](../README.md)

***

# Interface: AgentRequestRecord

## Extends

- [`RequestRecord`](RequestRecord.md)

## Properties

### created\_at

> **created\_at**: `string`

#### Inherited from

[`RequestRecord`](RequestRecord.md).[`created_at`](RequestRecord.md#created_at)

***

### execution

> **execution**: `object`

#### status

> **status**: [`DispatchStatus`](../enumerations/DispatchStatus.md)

#### Inherited from

[`RequestRecord`](RequestRecord.md).[`execution`](RequestRecord.md#execution)

***

### missing\_grants?

> `optional` **missing\_grants?**: `object`

#### agent\_secret?

> `optional` **agent\_secret?**: `boolean`

#### secret\_destination?

> `optional` **secret\_destination?**: `boolean`

#### Inherited from

[`RequestRecord`](RequestRecord.md).[`missing_grants`](RequestRecord.md#missing_grants)

***

### pending\_dispatch\_event?

> `optional` **pending\_dispatch\_event?**: `object`

#### emitted\_at

> **emitted\_at**: `string`

#### event\_id

> **event\_id**: `string`

#### Inherited from

[`RequestRecord`](RequestRecord.md).[`pending_dispatch_event`](RequestRecord.md#pending_dispatch_event)

***

### reason

> **reason**: `string`

#### Inherited from

[`RequestRecord`](RequestRecord.md).[`reason`](RequestRecord.md#reason)

***

### request

> **request**: `object`

#### body?

> `optional` **body?**: `string`

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

#### method

> **method**: `string`

#### secret\_id

> **secret\_id**: `string` \| `null`

#### target\_url

> **target\_url**: `string`

#### Inherited from

[`RequestRecord`](RequestRecord.md).[`request`](RequestRecord.md#request)

***

### request\_id

> **request\_id**: `string`

#### Inherited from

[`RequestRecord`](RequestRecord.md).[`request_id`](RequestRecord.md#request_id)

***

### requested\_at

> **requested\_at**: `string`

#### Inherited from

[`RequestRecord`](RequestRecord.md).[`requested_at`](RequestRecord.md#requested_at)

***

### response?

> `optional` **response?**: `object`

#### body?

> `optional` **body?**: `string`

#### error?

> `optional` **error?**: `string`

#### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

#### status?

> `optional` **status?**: `number`

#### Inherited from

[`RequestRecord`](RequestRecord.md).[`response`](RequestRecord.md#response)

***

### root\_agent\_id

> **root\_agent\_id**: `string`

#### Inherited from

[`RequestRecord`](RequestRecord.md).[`root_agent_id`](RequestRecord.md#root_agent_id)

***

### vault\_id

> **vault\_id**: `string`

#### Inherited from

[`RequestRecord`](RequestRecord.md).[`vault_id`](RequestRecord.md#vault_id)
