import assert from "node:assert/strict";
import { mkdtemp, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  FsStorageProvider,
  createVault,
  createOwnerClient,
} from "../../dist/runtime/index.js";

const tempDir = await mkdtemp(join(tmpdir(), "cbio-retire-secret-"));
const storage = new FsStorageProvider(tempDir);
const created = await createVault(storage, {
  password: "pw-retire-secret",
  nickname: "Retire Secret",
});

const client = createOwnerClient({
  vault: created.vault,
  password_verifier: created.verifyPassword,
  skipWarmup: true,
});

await client.ownerCreateSecret({
  alias: "demo-secret",
  plaintext: "shh",
});

const beforeEntries = await readdir(join(tempDir, "vaults", `${created.core.vault_id.value}_v1`));
const secretFilesBefore = beforeEntries.filter((entry) => entry.startsWith("secret-"));
assert.ok(secretFilesBefore.length >= 1, "expected physical secret material before retire");

await client.ownerRemoveSecret({
  alias: "demo-secret",
  password: "pw-retire-secret",
});

await assert.rejects(
  () => client.ownerExportSecret({ alias: "demo-secret", password: "pw-retire-secret" }),
  /VAULT_SECRET_NOT_FOUND|secret not found/,
);

const listedSecrets = await client.ownerListSecrets();
assert.equal(listedSecrets.some((secret) => secret.alias.value === "demo-secret"), false);

const afterEntries = await readdir(join(tempDir, "vaults", `${created.core.vault_id.value}_v1`));
const secretFilesAfter = afterEntries.filter((entry) => entry.startsWith("secret-"));
assert.equal(secretFilesAfter.length, secretFilesBefore.length, "physical secret material should remain after retire");

console.log("owner retire secret smoke ok");
