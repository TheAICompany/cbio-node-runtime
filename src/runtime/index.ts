/**
 * Runtime export. For agent developers.
 * Owner, Agent, storage, errors. Consumer surface only.
 */

export { CbioIdentity, CbioAgent } from "../agent/agent.js";
export type {
  ManagedAgentContext,
  ManagedAgentIssueOptions,
  ManagedAgentLoadOptions,
  RegisterChildIdentityOptions,
  IdentityLoadKeys,
  IdentityLoadOptions,
} from "../agent/agent.js";
export type { MergeResult } from "../vault/vault.js";
export type { FetchFailure, FetchResult, FetchSuccess } from "../http/secretAcquisition.js";
export { generateIdentityKeys } from "../protocol/crypto.js";
export { IdentityError, IdentityErrorCode } from "../errors.js";
export type { IStorageProvider } from "../storage/provider.js";
export { FsStorageProvider } from "../storage/fs.js";
export { MemoryStorageProvider } from "../storage/memory.js";
export { getChildIdentitySecretName, CHILD_KEY_PREFIX } from "../protocol/identity.js";
export {
  startLocalAuthProxy,
  type FetchWithAuthLike,
  type LocalAuthProxyOptions,
  type LocalAuthProxyHandle,
} from "../http/localAuthProxy.js";
