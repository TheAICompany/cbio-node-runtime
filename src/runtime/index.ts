/**
 * Runtime export. For agent developers.
 * Owner, Agent, storage, errors. Consumer surface only.
 */

export { CbioIdentity, CbioAgent } from "../impl/agent.js";
export type { ManagedAgentContext, ManagedAgentOptions, ManagedAgentRecord } from "../impl/agent.js";
export type { MergeResult } from "../impl/vault.js";
export type { FetchResult } from "../impl/secretAcquisition.js";
export { generateIdentityKeys } from "../impl/crypto.js";
export { IdentityError, IdentityErrorCode } from "../errors.js";
export type { IStorageProvider } from "../storage/provider.js";
export { FsStorageProvider } from "../storage/fs.js";
export { MemoryStorageProvider } from "../storage/memory.js";
export { getChildIdentitySecretName, CHILD_KEY_PREFIX } from "../impl/identity.js";
export {
  startLocalAuthProxy,
  type FetchWithAuthLike,
  type LocalAuthProxyOptions,
  type LocalAuthProxyHandle,
  type SupportedProxyProvider,
} from "../proxy/localAuthProxy.js";
