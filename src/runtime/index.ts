/**
 * Runtime export. For agent developers.
 * Owner, Agent, storage, errors. Consumer surface only.
 */

export { CbioIdentity, CbioAgent } from "../agent/agent.js";
export type {
  ActivityLogConfig,
  GetAgentOptions,
  IssuedCapabilityName,
  ManagedAgentHandleConfig,
  ManagedAgentCapabilityInfo,
  ManagedAgentCapabilityStatus,
  ManagedAgentContext,
  ManagedAgentIssueConfig,
  ManagedAgentIssueOptions,
  ManagedAgentLoadOptions,
  ManagedAgentStorageConfig,
  RegisterChildIdentityOptions,
  RegisterChildIdentityResult,
  IdentityLoadKeys,
  IdentityLoadOptions,
  RuntimePermissionName,
  RuntimePermissions,
  StartLocalSecretIngressOptions,
} from "../agent/agent.js";
export type { MergeResult } from "../vault/vault.js";
export type {
  FetchFailure,
  FetchJsonAndAddSecretOptions,
  FetchJsonAndUpdateSecretOptions,
  FetchResult,
  FetchSuccess,
} from "../http/secretAcquisition.js";
export { generateIdentityKeys, derivePublicKey } from "../protocol/crypto.js";
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
export {
  startLocalSecretIngress,
  type LocalSecretIngressHandle,
  type LocalSecretIngressOptions,
  type LocalSecretIngressResult,
  type LocalSecretIngressWriter,
} from "../http/localSecretIngress.js";
