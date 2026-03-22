import { createVault } from "./src/runtime/bootstrap.js";
import { createIdentity } from "./src/runtime/identity.js";
import { createWorkspaceStorage } from "./src/runtime/workspace-storage.js";
import fs from "node:fs/promises";
import path from "node:path";

async function run() {
  const workspaceDir = path.join(process.cwd(), "tmp-verification-vault");
  await fs.rm(workspaceDir, { recursive: true, force: true });
  process.env.C_BIO_WORKSPACE_DIR = workspaceDir;

  const owner = createIdentity({ nickname: "Owner" });

  console.log("--- Creating vault with exposed nickname ---");
  const vault1 = await createVault({
    ownerIdentity: owner,
    nickname: "My Public Vault",
    exposeNickname: true,
  });

  const vault1Dir = path.join(workspaceDir, "vaults", vault1.core.vaultId.value);
  const profileSealedPath = path.join(vault1Dir, "vault", "profile.sealed");
  const nicknameTxtPath = path.join(vault1Dir, "vault", "nickname.txt");

  const profileExists = await fs.access(profileSealedPath).then(() => true).catch(() => false);
  const nicknameExists = await fs.access(nicknameTxtPath).then(() => true).catch(() => false);

  console.log(`Profile sealed exists: ${profileExists}`);
  console.log(`Nickname txt exists: ${nicknameExists}`);

  if (nicknameExists) {
    const nickname = await fs.readFile(nicknameTxtPath, "utf8");
    console.log(`Nickname content: ${nickname}`);
  }

  const profileContent = await fs.readFile(profileSealedPath, "utf8");
  try {
    JSON.parse(profileContent);
    console.log("ERROR: Profile is plaintext JSON!");
  } catch (e) {
    console.log("Profile is encrypted (not valid JSON)");
  }

  console.log("\n--- Creating vault with hidden nickname ---");
  const vault2 = await createVault({
    ownerIdentity: owner,
    nickname: "My Private Vault",
    exposeNickname: false,
  });

  const vault2Dir = path.join(workspaceDir, "vaults", vault2.core.vaultId.value);
  const nicknameTxtPath2 = path.join(vault2Dir, "vault", "nickname.txt");
  const nicknameExists2 = await fs.access(nicknameTxtPath2).then(() => true).catch(() => false);
  console.log(`Nickname txt exists for vault 2: ${nicknameExists2}`);

  console.log("\n--- Checking other metadata ---");
  const secretsPath = path.join(vault1Dir, "vault", "secrets.sealed");
  const secretsExists = await fs.access(secretsPath).then(() => true).catch(() => false);
  console.log(`Secrets sealed exists: ${secretsExists}`);

  await fs.rm(workspaceDir, { recursive: true, force: true });
}

run().catch(console.error);
