import { verifySignature } from "../src/protocol/crypto.js";

const envelope = {
  "payload": {
    "identityId": "agt_CCG5HSMm98v3S5IsoeVDpJxCOQzmwb70VBMc26RVYC0",
    "publicKey": "MCowBQYDK2VwAyEAUXwDuGl7MtZYvYqE9_osbPpWxY8NjajtKmuAORcdIZc"
  },
  "signature": "Wit8K8F0LHL964K-jGcqAau45u0nGhM0GK1FZphUYIrpJIO1g7A5l4ISnoCpj7xUXxLO67I6f00bqGwa0ZSMCA",
  "signer": "MCowBQYDK2VwAyEAUXwDuGl7MtZYvYqE9_osbPpWxY8NjajtKmuAORcdIZc"
};

async function check() {
  // Test variations of payload strings
  const variations = [
    // 1. Compact JSON (V8 default)
    JSON.stringify(envelope.payload),
    // 2. Sorted Compact JSON (My sortObject)
    '{"identityId":"agt_CCG5HSMm98v3S5IsoeVDpJxCOQzmwb70VBMc26RVYC0","publicKey":"MCowBQYDK2VwAyEAUXwDuGl7MtZYvYqE9_osbPpWxY8NjajtKmuAORcdIZc"}',
    // 3. Reversed Compact JSON
    '{"publicKey":"MCowBQYDK2VwAyEAUXwDuGl7MtZYvYqE9_osbPpWxY8NjajtKmuAORcdIZc","identityId":"agt_CCG5HSMm98v3S5IsoeVDpJxCOQzmwb70VBMc26RVYC0"}',
    // 4. Indented JSON (Indentation 2)
    JSON.stringify(envelope.payload, null, 2),
  ];

  for (const [i, p] of variations.entries()) {
    const ok = await verifySignature(envelope.signer, p, envelope.signature);
    console.log(`Variation ${i+1}: ${ok} | Content: ${p}`);
  }
}

check().catch(console.error);
