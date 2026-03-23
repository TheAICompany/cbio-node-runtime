import { signPayload, verifySignature, derivePublicKey, generateIdentityKeys } from "../src/protocol/crypto.js";

function sortObject(obj: any): any {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    if (Array.isArray(obj)) {
      return obj.map(sortObject);
    }
    return obj;
  }
  const sorted: any = {};
  Object.keys(obj).sort().forEach(key => {
    if (obj[key] !== undefined) {
      sorted[key] = sortObject(obj[key]);
    }
  });
  return sorted;
}

async function test() {
  const keys = generateIdentityKeys();
  const payload = {
    identityId: "agt_test",
    publicKey: keys.publicKey,
    nickname: "测试昵称", // Chinese characters to test UTF-8
    parentIdentityId: undefined, // Test undefined handling
  };

  const payloadStr = JSON.stringify(sortObject(payload));
  console.log("Original Payload String:", payloadStr);
  
  const signature = await signPayload(keys.privateKey!, payloadStr);
  console.log("Signature:", signature);

  const isValid = await verifySignature(keys.publicKey!, payloadStr, signature);
  console.log("Direct Verification:", isValid);

  // Simulate Round-trip
  const envelope = {
    payload,
    signature,
    signer: keys.publicKey!,
  };
  const json = JSON.stringify(envelope, null, 2);
  const parsed = JSON.parse(json);
  
  const reconstructedPayloadStr = JSON.stringify(sortObject(parsed.payload));
  console.log("Reconstructed Payload String:", reconstructedPayloadStr);
  
  const isReconstructedValid = await verifySignature(parsed.signer, reconstructedPayloadStr, parsed.signature);
  console.log("Reconstructed Verification:", isReconstructedValid);
}

test().catch(console.error);
