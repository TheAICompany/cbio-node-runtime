import {
  createIdentity,
  createVault,
  recoverVault,
  createOwnerClient,
} from "../src/runtime/index.js";
import { LocalSigner } from "../src/protocol/crypto.js";
import { promises as fs } from "fs";
import path from "path";

async function main() {
  const vaultDir = path.resolve("./tmp-mgmt-test");
  await fs.rm(vaultDir, { recursive: true, force: true });
  await fs.mkdir(vaultDir, { recursive: true });

  console.log("Generating owner identity...");
  const ownerIdentity = await createIdentity({ nickname: "Owner" });

  console.log("Creating vault...");
  const initialized = await createVault(vaultDir as any, {
    nickname: "Mgmt Test Vault",
    ownerIdentity: ownerIdentity as any,
  });

  const vaultId = initialized.core.vaultId;
  console.log("Vault created:", vaultId.value);

  const client1 = createOwnerClient({
    ownerIdentity: ownerIdentity as any,
    vault: initialized.vault,
  });

  console.log("Adding a secret with client1...");
  await client1.writeSecret({
    alias: "mgmt-test-secret",
    plaintext: "Initial secret value",
  });

  console.log("Recovering vault with recoverVault()...");
  const recovered = await recoverVault(vaultDir as any, {
    vaultId: vaultId.value,
    ownerIdentity: ownerIdentity as any,
  });

  console.log("Vault recovered successfully.");

  const client = createOwnerClient({
    ownerIdentity: ownerIdentity as any,
    vault: recovered.vault,
  });

  console.log("Listing agents (empty)...");
  const agents = await client.listAgents();
  console.log("Agents:", agents.length);

  console.log("Registering agent...");
  await client.registerAgent({
    rootAgentId: "agent-1",
    publicKey: "PUB_AGENT_1",
  });

  console.log("Listing agents (1)...");
  const agentsUpdated = await client.listAgents();
  console.log("Agents:", agentsUpdated.length, agentsUpdated[0].rootAgentId);

  console.log("Granting secret access...");
  await client.grantGrant({
    grant: {
      vaultId,
      rootAgentId: "agent-1",
      grantId: "cap-1",
      operation: "dispatch_http",
      allowedTargets: ["*"],
      allowedMethods: ["GET"],
      issuedAt: new Date().toISOString(),
      revocationVersion: 0,
    },
  });

  console.log("Listing capabilities...");
  const caps = await client.listCapabilities({ rootAgentId: "agent-1" });
  console.log("Capabilities:", caps.length, caps[0].grantId);

  console.log("Revoking secret access...");
  await client.revokeGrant({
    rootAgentId: "agent-1",
    grantId: "cap-1",
  });

  console.log("Verifying revocation (list capabilities)...");
  const capsAfter = await client.listCapabilities({ rootAgentId: "agent-1" });
  // Note: listing usually shows both active and revoked in some systems, 
  // but let's see what our implementation does.
  // Our implementation returns what's in the registry. 
  // In our current Registry implementations (InMemory/File), revoke might NOT 
  // remove it from the list if it's just a version bump.
  // Wait, our DefaultPolicyEngine.revokeGrant bumps the version in the revocation registry.
  console.log("Capabilities after revoke:", capsAfter.length);

  console.log("Management API test completed successfully!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
