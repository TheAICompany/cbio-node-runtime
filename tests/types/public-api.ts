import type {
  AgentClient,
  AgentDispatchIntent,
  CreateOwnerClientOptions,
  OwnerClient,
  OwnerPendingApprovalView,
  OwnerRequestDetailView,
  OwnerRequestSummaryView,
  VaultClient,
  CreateVaultClientOptions,
} from "../../dist/runtime/index.js";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

type _ownerClientAliasIsStable = Assert<IsEqual<OwnerClient, VaultClient>>;
type _ownerOptionsAliasIsStable = Assert<IsEqual<CreateOwnerClientOptions, CreateVaultClientOptions>>;

declare const owner: OwnerClient;
declare const agent: AgentClient;
declare const summary: OwnerRequestSummaryView;
declare const detail: OwnerRequestDetailView;
declare const pending: OwnerPendingApprovalView;

owner.ownerListRequests({ agentId: "agent_123" });
owner.ownerGetRequest({ requestId: summary.requestId });
owner.ownerOnCapabilityState((record) => {
  const id: string | undefined = record.requestId;
  const writeGrant = record.writeGrant;
  const readGrant = record.readGrant;
  void id;
  void writeGrant;
  void readGrant;
});

const detailRequestUrl: string = detail.request.targetUrl;
const detailMethod: string = detail.request.method;
const pendingRequestId: string | undefined = pending.requestId;
const pendingWriteGrant = pending.writeGrant;
const pendingReadGrant = pending.readGrant;

void detailRequestUrl;
void detailMethod;
void pendingRequestId;
void pendingWriteGrant;
void pendingReadGrant;

const dispatchIntent: AgentDispatchIntent = {
  targetUrl: "https://api.example.com/data",
  method: "POST",
  reason: "sync data to upstream system",
  body: JSON.stringify({ ok: true }),
};

agent.agentDispatch(dispatchIntent);
