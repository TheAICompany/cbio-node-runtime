import {
  MemoryStorageProvider,
  createVault,
  createOwnerClient,
  OwnerClientErrorCode,
} from "../../dist/runtime/index.js";

async function main() {
  const storage = new MemoryStorageProvider();
  const vault = await createVault(storage, {
    password: "hunter2",
    nickname: "Owner Sensitive Errors",
  });
  const client = createOwnerClient({
    vault: vault.vault,
    password_verifier: async (password) => password === "hunter2",
    skipWarmup: true,
  });

  await client.ownerCreateSecret({
    alias: "demo",
    plaintext: "value",
  });

  let invalidPasswordCode;
  try {
    await client.ownerReadSecretPlaintext({
      alias: "demo",
      password: "wrong",
    });
  } catch (error) {
    invalidPasswordCode = error.code;
  }
  if (invalidPasswordCode !== OwnerClientErrorCode.SENSITIVE_ACTION_INVALID_PASSWORD) {
    throw new Error(`expected invalid password code, got ${String(invalidPasswordCode)}`);
  }

  let missingPrivateKeyCode;
  try {
    await client.ownerReadAgentPrivateKey({
      root_agent_id: "missing",
      password: "hunter2",
    });
  } catch (error) {
    missingPrivateKeyCode = error.code;
  }
  if (missingPrivateKeyCode !== OwnerClientErrorCode.AGENT_PRIVATE_KEY_NOT_FOUND) {
    throw new Error(`expected missing private key code, got ${String(missingPrivateKeyCode)}`);
  }

  console.log("owner-sensitive-errors smoke passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
