import assert from "node:assert/strict";
import http from "node:http";
import { AgentDispatchHttpTransport } from "../../dist/vault-ingress/remote-transport.js";

/**
 * Smoke test for AgentDispatchHttpTransport.
 * Requires the project to be built (dist/ folder present).
 */
async function test() {
  const PORT = 4567;
  let receivedRequest = null;

  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/dispatch") {
      let body = "";
      for await (const chunk of req) body += chunk;
      receivedRequest = JSON.parse(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        result: {
          status: "SUCCEEDED",
          response_body: "mock-ok"
        }
      }));
    }
  });

  await new Promise(r => server.listen(PORT, r));

  try {
    const transport = new AgentDispatchHttpTransport(`http://localhost:${PORT}/dispatch`);
    const mockRequest = {
      vault_id: { value: "v-1" },
      request_id: "r-1",
      requested_at: "2024-01-01T00:00:00Z",
      agent: { id: "a-1" },
      grant: { grantId: "c-1" },
      secret_id: "s-1",
      target_url: "https://example.com",
      method: "GET",
      proof: { token: "sat-1" }
    };

    const result = await transport.agentDispatch(mockRequest);

    assert.equal(result.status, "SUCCEEDED");
    assert.equal(result.response_body, "mock-ok");
    assert.ok(receivedRequest);
    assert.equal(receivedRequest.vault_id, "v-1");
    assert.equal(receivedRequest.proof.token, "sat-1");

    console.log("AgentDispatchHttpTransport smoke test PASSED");
  } finally {
    server.close();
  }
}

test().catch(err => {
  console.error("AgentDispatchHttpTransport smoke test FAILED");
  console.error(err);
  process.exit(1);
});
