import crypto from 'node:crypto';
import { verifySignature } from "@the-ai-company/cbio-protocol";

const envelope = {
  "payload": {
    "identityId": "agt_CCG5HSMm98v3S5IsoeVDpJxCOQzmwb70VBMc26RVYC0",
    "publicKey": "MCowBQYDK2VwAyEAUXwDuGl7MtZYvYqE9_osbPpWxY8NjajtKmuAORcdIZc"
  },
  "signature": "Wit8K8F0LHL964K-jGcqAau45u0nGhM0GK1FZphUYIrpJIO1g7A5l4ISnoCpj7xUXxLO67I6f00bqGwa0ZSMCA",
  "signer": "MCowBQYDK2VwAyEAUXwDuGl7MtZYvYqE9_osbPpWxY8NjajtKmuAORcdIZc"
};

const payloadStr = '{"identityId":"agt_CCG5HSMm98v3S5IsoeVDpJxCOQzmwb70VBMc26RVYC0","publicKey":"MCowBQYDK2VwAyEAUXwDuGl7MtZYvYqE9_osbPpWxY8NjajtKmuAORcdIZc"}';

async function compare() {
  console.log("Input Payload String:", payloadStr);
  
  // 1. Native Crypto Verification
  const nativeOk = crypto.verify(
    null,
    Buffer.from(payloadStr, 'utf8'),
    crypto.createPublicKey({
      key: Buffer.from(envelope.signer, 'base64url'),
      format: 'der',
      type: 'spki'
    }),
    Buffer.from(envelope.signature, 'base64url')
  );
  console.log("Native Crypto Result:", nativeOk);

  // 2. Protocol Library Verification
  try {
    const protocolOk = await verifySignature(envelope.signer, payloadStr, envelope.signature);
    console.log("Protocol Library Result:", protocolOk);
  } catch (e) {
    console.log("Protocol Library Error:", e.message);
  }
}

compare().catch(console.error);
