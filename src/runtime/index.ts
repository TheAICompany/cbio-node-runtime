/**
 * Runtime export. For agent developers.
 * Owner, Agent, storage, errors. Consumer surface only.
 */

export { CbioIdentity, CbioAgent } from "../agent/agent.js";
export type {
  GetAgentOptions,
  IssuedCapabilityName,
  ManagedAgentHandleConfig,
  ManagedAgentContext,
  ManagedAgentIssueConfig,
  ManagedAgentIssueOptions,
  ManagedAgentLoadOptions,
  ManagedAgentStorageConfig,
  RegisterChildIdentityOptions,
  IdentityLoadKeys,
  IdentityLoadOptions,
  RuntimePermissionName,
  RuntimePermissions,
} from "../agent/agent.js";
export type { MergeResult } from "../vault/vault.js";
export type {
  FetchFailure,
  FetchJsonAndAddSecretOptions,
  FetchJsonAndUpdateSecretOptions,
  FetchResult,
  FetchSuccess,
} from "../http/secretAcquisition.js";
export { generateIdentityKeys } from "../protocol/crypto.js";
export { IdentityError, IdentityErrorCode } from "../errors.js";
export type { IStorageProvider } from "../storage/provider.js";
export { FsStorageProvider } from "../storage/fs.js";
export { MemoryStorageProvider } from "../storage/memory.js";
export {
  startLocalAuthProxy,
  type FetchWithAuthLike,
  type LocalAuthProxyOptions,
  type LocalAuthProxyHandle,
} from "../http/localAuthProxy.js";
