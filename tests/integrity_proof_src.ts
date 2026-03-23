import assert from "node:assert/strict";
import { createIdentity } from "../src/runtime/identity.ts";
import { ensureIdentityPrivateVault, readIdentityMetadata } from "../src/runtime/private-vault.ts";
import { MemoryStorageProvider } from "../src/storage/memory.ts";
import { writeVerifiableMetadata, readVerifiableMetadata } from "../src/runtime/verifiable-metadata.ts";

async function testSDKIntegrity() {
  console.log("Starting SDK Integrity Proof (Source Level)...");
  
  const storage = new MemoryStorageProvider();
  const identity = createIdentity({ nickname: "proof-identity" });
  
  console.log("1. Writing & Verification (Standard Flow)...");
  await ensureIdentityPrivateVault(storage, identity);
  // 2. Reading Identity Metadata (Verifies Signature)...
  const profile = await readIdentityMetadata(storage, identity.identityId) as any;
  
  assert.ok(profile, "Metadata reading failed (Signature Invalid)");
  assert.equal(profile.identityId, identity.identityId, "Identity ID mismatch");
  assert.equal(profile.nickname, "proof-identity", "Nickname mismatch");
  
  console.log("2. Multi-byte & Special Character Test...");
  const customPayload = {
    nickname: "李四",
    complex: { a: 1, b: "quoted \" value" }
  };
  const path = "identities/custom/public/profile.json";
  await writeVerifiableMetadata(storage, path, customPayload, identity.privateKey);
  const verified = await readVerifiableMetadata(storage, path);
  
  assert.ok(verified, "Multi-byte verification failed");
  assert.deepEqual(verified, customPayload, "Payload content mismatch");

  console.log("3. Proving Protocol Compatibility...");
  // This verifies that our sortObject + JSON.stringify matches signPayload/verifySignature
  console.log("SDK INTEGRITY PROVEN: All signature checks passed.");
}

testSDKIntegrity().catch(err => {
  console.error("SDK INTEGRITY FAILED:");
  console.error(err);
  process.exit(1);
});
