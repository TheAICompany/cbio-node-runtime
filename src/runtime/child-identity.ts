import type { IStorageProvider } from "../storage/provider.js";
import type { ChildIdentity, CreatedIdentity, CreateIdentityOptions } from "./identity.js";
import { deriveChildIdentity } from "./identity.js";
import {
  ensureIdentityPrivateVault,
  readIdentityPrivateVaultChildrenState,
  withIdentityPrivateVaultLock,
  writeIdentityPrivateVaultChildrenState,
} from "./private-vault.js";

export interface CreateChildIdentityOptions extends CreateIdentityOptions {}

export async function createChildIdentity(
  storage: IStorageProvider,
  parentIdentity: CreatedIdentity | string,
  options: CreateChildIdentityOptions = {},
): Promise<ChildIdentity> {
  const parent =
    typeof parentIdentity === "string"
      ? undefined
      : parentIdentity;
  if (!parent) {
    throw new Error("parent identity object is required");
  }
  const run = async (): Promise<ChildIdentity> => {
    await ensureIdentityPrivateVault(storage, parent);
    const state = await readIdentityPrivateVaultChildrenState(storage, parent);
    const childIndex = state.nextChildIndex;
    const childIdentity = deriveChildIdentity(parent, childIndex, options);
    await ensureIdentityPrivateVault(storage, childIdentity);
    state.nextChildIndex += 1;
    state.children.push({
      identityId: childIdentity.identityId,
      parentIdentityId: childIdentity.parentIdentityId!,
      childIndex,
      nickname: childIdentity.nickname,
      publicKey: childIdentity.publicKey,
    });
    await writeIdentityPrivateVaultChildrenState(storage, parent, state);
    return childIdentity;
  };
  return withIdentityPrivateVaultLock(storage, parent, run);
}
