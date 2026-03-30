import { createPersistentVaultCoreDependencies, createVaultCore } from "../../src/vault-core/index.js";
import { createVaultService } from "../../src/vault-ingress/index.js";
import { createOwnerClient } from "../../src/clients/owner/index.js";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

async function runBatchExportTest() {
  const baseDir = path.join(process.cwd(), ".tmp-batch-test");
  if (fs.existsSync(baseDir)) fs.rmSync(baseDir, { recursive: true });
  fs.mkdirSync(baseDir);

  const vault_id = "test-vault";
  const vaultWorkingKey = "test-key-base64url-must-be-32-bytes-long-123456"; 
  
  const deps = createPersistentVaultCoreDependencies({ getBaseDir: () => baseDir }, {
    vault_id,
    vaultWorkingKey: Buffer.from("a".repeat(32)).toString('base64url'),
    proofVerifier: {} as any,
    fetchImpl: {} as any,
  });

  const core = createVaultCore(deps);
  const ingress = createVaultService(core);
  const client = await createOwnerClient({ 
    vault: ingress,
    password_verifier: () => true 
  });

  console.log("1. Creating multiple secrets...");
  await client.ownerCreateSecret({ alias: "secret-1", plaintext: "value-1" });
  await client.ownerCreateSecret({ alias: "secret-2", plaintext: "value-2" });
  await client.ownerCreateSecret({ alias: "secret-3", plaintext: "value-3" });

  console.log("2. Testing Single Export (with alias)...");
  const single = await client.ownerExportSecret({ alias: "secret-2", password: "any" });
  assert.strictEqual(single.length, 1, "Single export should return array of length 1");
  assert.strictEqual(single[0].alias, "secret-2");
  assert.strictEqual(single[0].plaintext, "value-2");
  console.log("   ✅ Single export passed.");

  console.log("3. Testing Batch Export (without alias)...");
  const batch = await client.ownerExportSecret({ password: "any" });
  assert.strictEqual(batch.length, 3, "Batch export should return 3 secrets");
  
  const aliases = batch.map((s: any) => s.alias).sort();
  assert.deepStrictEqual(aliases, ["secret-1", "secret-2", "secret-3"]);
  
  const values = batch.map((s: any) => s.plaintext).sort();
  assert.deepStrictEqual(values, ["value-1", "value-2", "value-3"]);
  console.log("   ✅ Batch export passed.");

  console.log("4. Verifying Batch Audit Entry...");
  const audit = await client.ownerReadAudit({});
  const batchAudit = audit.find((e: any) => e.function_name === "ownerExportSecret");
  assert.ok(batchAudit, "Batch export audit entry missing");
  console.log("   ✅ Batch audit verified.");

  console.log("\n🎊 ALL BATCH EXPORT TESTS PASSED!");
  
  fs.rmSync(baseDir, { recursive: true });
}

runBatchExportTest().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
