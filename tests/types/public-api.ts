import type {
  AgentClient,
  AgentDispatchIntent,
  CreateOwnerClientOptions,
  OwnerClient,
  RequestRecord,
  OwnerRequestRecord,
  OwnerVisibleRequestRecord,
} from "../../src/runtime/index.js";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

type _ownerClientAliasIsStable = Assert<IsEqual<OwnerClient, OwnerClient>>;
type _ownerOptionsAliasIsStable = Assert<IsEqual<CreateOwnerClientOptions, CreateOwnerClientOptions>>;

declare const owner: OwnerClient;
declare const agent: AgentClient;
declare const summary: OwnerVisibleRequestRecord;
declare const detail: OwnerRequestRecord;
declare const pending: RequestRecord;

owner.ownerListRequests({ root_agent_id: "agent_123" });
owner.ownerReadAudit({ root_agent_id: "agent_123" });
owner.ownerGetRequest({ request_id: summary.request_id });
owner.ownerOnPendingDispatch((record) => {
  const id: string | undefined = record.request_id;
  void id;
});

const detailRequestUrl: string = detail.request.target_url;
const detailMethod: string = detail.request.method;
const pendingRequestId: string | undefined = pending.request_id;

void detailRequestUrl;
void detailMethod;
void pendingRequestId;

const dispatchIntent: AgentDispatchIntent = {
  target_url: "https://api.example.com/data",
  method: "POST",
  reason: "sync data to upstream system",
  body: JSON.stringify({ ok: true }),
};

agent.agentDispatch(dispatchIntent);
