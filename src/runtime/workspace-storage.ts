import * as os from "node:os";
import * as path from "node:path";
import { FsStorageProvider } from "../storage/fs.js";

export function getDefaultWorkspaceDir(): string {
  return process.env.C_BIO_WORKSPACE_DIR || path.join(os.homedir(), "cbio");
}

export function createWorkspaceStorage(baseDir = getDefaultWorkspaceDir()): FsStorageProvider {
  return new FsStorageProvider(baseDir);
}
