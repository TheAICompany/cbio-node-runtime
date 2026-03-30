import type {
  AgentClient,
  AgentDispatchIntent,
  CreateOwnerClientOptions,
  OwnerClient,
  PendingDispatchEvent,
  OwnerRequestRecord,
} from "../../src/runtime/index.js";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

type _ownerClientAliasIsStable = Assert<IsEqual<OwnerClient, OwnerClient>>;
type _ownerOptionsAliasIsStable = Assert<IsEqual<CreateOwnerClientOptions, CreateOwnerClientOptions>>;

declare const owner: OwnerClient;
declare const agent: AgentClient;
declare const summary: OwnerRequestRecord;
declare const detail: OwnerRequestRecord;
declare const pending: PendingDispatchEvent;

owner.ownerListRequests({ root_agent_id: "agent_123" });
owner.ownerReadAudit({ root_agent_id: "agent_123" });
owner.ownerGetRequest({ request_id: summary.request_id });
owner.ownerOnPendingDispatch({
  afterEventId: "2026-03-29T00:00:00.000Z::req_123",
  onEvent: (event) => {
    const id: string | undefined = event.record.request_id;
    void id;
  },
});

const detailRequestUrl: string = detail.request.target_url;
const detailMethod: string = detail.request.method;
const pendingRequestId: string | undefined = pending.record.request_id;
const pendingEventId: string = pending.event_id;

void detailRequestUrl;
void detailMethod;
void pendingRequestId;
void pendingEventId;

const dispatchIntent: AgentDispatchIntent = {
  target_url: "https://api.example.com/data",
  method: "POST",
  reason: "sync data to upstream system",
  body: JSON.stringify({ ok: true }),
};

agent.agentDispatch(dispatchIntent);
