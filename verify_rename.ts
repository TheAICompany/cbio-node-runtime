
import { createVaultCore } from "./src/vault-core/index.js";
import { createVaultService } from "./src/vault-ingress/index.js";
import { createOwnerClient } from "./src/clients/owner/client.js";
import { createVaultCoreDependencies } from "./src/vault-core/defaults.js";

async function test() {
  const deps = createVaultCoreDependencies();
  const core = createVaultCore(deps);
  const service = createVaultService(core);
  const client = await createOwnerClient({ vault: service, skipWarmup: true });

  const vault_id = service.vault_id;

  console.log("1. Creating secret 'A'...");
  await client.ownerCreateSecret({ alias: "A", plaintext: "secret-value-a" });

  console.log("2. Granting 'A' to agent 'agent1'...");
  await client.ownerGrantAgentSecret({ root_agent_id: "agent1", secret_alias: "A" });

  console.log("3. Verifying grant for 'A'...");
  let secrets = await client.ownerListSecrets();
  let secretA = secrets.find(s => s.alias === "A");
  if (!secretA) throw new Error("Secret A not found");
  
  let grants = await client.ownerListGrants({ root_agent_id: "agent1" });
  let hasGrantA = grants.agent_secrets.some(g => g.secret_id === secretA.secret_id);
  console.log("   Has grant for A:", hasGrantA);
  if (!hasGrantA) throw new Error("Grant for A missing");

  console.log("4. Renaming 'A' to 'B' and updating value...");
  await client.ownerUpdateSecret({ alias: "A", new_alias: "B", plaintext: "new-value-b" });

  console.log("5. Verifying secret 'B' exists and 'A' is gone...");
  secrets = await client.ownerListSecrets();
  const hasB = secrets.some(s => s.alias === "B");
  const hasA = secrets.some(s => s.alias === "A");
  console.log("   Has B:", hasB, "Has A:", hasA);
  if (!hasB || hasA) throw new Error("Secret rename failed");

  console.log("6. Verifying grant migrated to 'B'...");
  const secretB = secrets.find(s => s.alias === "B");
  if (!secretB) throw new Error("Secret B not found");
  
  grants = await client.ownerListGrants({ root_agent_id: "agent1" });
  const hasGrantB = grants.agent_secrets.some(g => g.secret_id === secretB.secret_id);
  hasGrantA = grants.agent_secrets.some(g => g.secret_id === secretA.secret_id); 
  // Note: hasGrantA should still be true because both point to the same secret_id
  console.log("   Has grant for B (by ID):", hasGrantB, "Has grant for A (by original ID):", hasGrantA);
  if (!hasGrantB) throw new Error("Grant migration failed");

  console.log("7. Verifying plaintext update for 'B'...");
  const exported = await client.ownerExportSecret({ alias: "B", password: "any" }); 
  console.log("   Value of B:", exported[0].plaintext);
  if (exported[0].plaintext !== "new-value-b") throw new Error("Value update failed");

  console.log("8. Testing only rename (no value update)...");
  await client.ownerUpdateSecret({ alias: "B", new_alias: "C" });
  const finalSecrets = await client.ownerListSecrets();
  const hasC = finalSecrets.some(s => s.alias === "C");
  console.log("   Has C:", hasC);
  if (!hasC) throw new Error("Only rename failed");

  console.log("9. Testing only value update (no rename)...");
  await client.ownerUpdateSecret({ alias: "C", plaintext: "final-value" });
  const finalExported = await client.ownerExportSecret({ alias: "C", password: "any" });
  console.log("   Final value of C:", finalExported[0].plaintext);
  if (finalExported[0].plaintext !== "final-value") throw new Error("Only value update failed");

  console.log("SUCCESS: All verification steps passed!");
}

test().catch(err => {
  console.error("Verification FAILED:", err);
  process.exit(1);
});
