/**
 * Runtime export. For agent developers.
 * Owner, Agent, storage, errors. Consumer surface only.
 */

export {
    CbioIdentity,
    CbioAgent,
} from '../core/agent.js';
export type {
    ManagedAgentContext,
    ManagedAgentOptions,
    ManagedAgentRecord,
} from '../core/agent.js';
export type { MergeResult } from '../core/vault.js';
export type { FetchResult } from '../core/secretAcquisition.js';
export { generateIdentityKeys } from '../core/crypto.js';
export { IdentityError, IdentityErrorCode } from '../errors.js';
export type { IStorageProvider } from '../storage/provider.js';
export { FsStorageProvider } from '../storage/fs.js';
export { MemoryStorageProvider } from '../storage/memory.js';
export { getChildIdentitySecretName, CHILD_KEY_PREFIX } from '../core/identity.js';
export {
    startLocalAuthProxy,
    type LocalAuthProxyOptions,
    type LocalAuthProxyHandle,
    type SupportedProxyProvider,
} from '../proxy/localAuthProxy.js';
