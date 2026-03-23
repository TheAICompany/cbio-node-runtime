import assert from "node:assert/strict";
import { createIdentity } from "../src/runtime/identity.js";
import { ensureIdentityPrivateVault, readIdentityMetadata } from "../src/runtime/private-vault.js";
import { MemoryStorageProvider } from "../src/storage/memory.js";

async function testSDKIntegrity() {
  console.log("Starting SDK Integrity Proof...");
  
  const storage = new MemoryStorageProvider();
  const identity = createIdentity({ nickname: "proof-identity" });
  
  console.log("1. Ensuring Identity Private Vault (Writes Signed Public Profile)...");
  await ensureIdentityPrivateVault(storage, identity);
  
  console.log("  // 2. Reading Identity Metadata (Verifies Signature)...");
  const profile = await readIdentityMetadata(storage, identity.identityId) as any;
  
  assert.ok(profile, "Metadata reading failed (Signature Invalid)");
  assert.equal(profile.identityId, identity.identityId, "Identity ID mismatch");
  assert.equal(profile.nickname, "proof-identity", "Nickname mismatch");
  
  // Test with custom data
  console.log("3. Testing Custom Metadata Round-trip...");
  const { writeVerifiableMetadata, readVerifiableMetadata } = await import("../src/runtime/verifiable-metadata.js");
  const customPayload = {
    foo: "bar",
    nested: { a: 1, b: [1, 2, 3] },
    special: "引号 \" 和 反斜杠 \\"
  };
  const path = "custom/profile.json";
  await writeVerifiableMetadata(storage, path, customPayload, identity.privateKey);
  
  const verifiedPayload = await readVerifiableMetadata(storage, path);
  assert.ok(verifiedPayload, "Custom verification failed");
  assert.deepEqual(verifiedPayload, customPayload, "Payload mismatch");

  console.log("SDK INTEGRITY PROVEN: All signature checks passed.");
}

testSDKIntegrity().catch(err => {
  console.error("SDK INTEGRITY FAILED:", err);
  process.exit(1);
});
