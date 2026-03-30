import assert from "node:assert/strict";
import {
  createOwnerClient,
  createAgentClient,
  createVaultCore,
  createVaultCoreDependencies,
} from "../../dist/runtime/index.js";
import { wrapVaultCoreAsVaultService } from "../../dist/vault-ingress/index.js";

const authority = createVaultCore(createVaultCoreDependencies({
  vault_id: "vault-audit-activity",
  fetchImpl: async () => new Response("ok", { status: 200 }),
}));
const vault = wrapVaultCoreAsVaultService(authority);

const ownerClient = await createOwnerClient({ vault });
const { agent, session_token } = await ownerClient.ownerCreateAgent({
  nickname: "Activity Bot",
});
const agentClient = createAgentClient({
  agentRecord: agent,
  vault,
  token: session_token.token,
});

await ownerClient.ownerCreateSecret({
  alias: "activity-key",
  plaintext: "activity-secret",
});

const pending = await agentClient.agentDispatch({
  target_url: "https://activity.example.com/data",
  method: "POST",
  secret_alias: "activity-key",
  reason: "Trigger approval audit",
  body: "ping",
});

assert.equal(pending.status, "AWAITING_APPROVAL");

const [request] = await ownerClient.ownerListRequests({ root_agent_id: agent.root_agent_id });
assert.ok(request, "expected a pending request");

await ownerClient.ownerApproveDispatch({
  request_id: request.request_id,
  decision: "allow_and_grant",
});

const activityAudit = await ownerClient.ownerReadAudit({
  root_agent_id: agent.root_agent_id,
});

assert.ok(
  activityAudit.some((entry) =>
    entry.function_name === "ownerApproveDispatch"
    && entry.input.request_id === request.request_id
    && entry.actor.kind === "owner"
    && entry.actor.id !== agent.root_agent_id
    && entry.input.root_agent_id === agent.root_agent_id),
  "approval audit should be discoverable via root_agent_id even when actor is owner",
);

assert.ok(
  activityAudit.some((entry) =>
    entry.function_name === "agentDispatchSecret"
    && entry.input.request_id === request.request_id
    && entry.actor.kind === "agent"
    && entry.actor.id === agent.root_agent_id
    && entry.input.root_agent_id === agent.root_agent_id
    && entry.output.status === "success"),
  "approved execution should emit a separate agent dispatch audit entry",
);

console.log("audit root agent activity smoke test passed");
