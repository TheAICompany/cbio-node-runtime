import { CbioIdentity } from '../core/agent.js';
export type SupportedProxyProvider = 'openai' | 'anthropic' | 'resend';
export interface LocalAuthProxyOptions {
    identity: CbioIdentity;
    secretName: string;
    provider: SupportedProxyProvider;
    host?: string;
    port?: number;
}
export interface LocalAuthProxyHandle {
    readonly provider: SupportedProxyProvider;
    readonly secretName: string;
    readonly upstreamBaseUrl: string;
    readonly host: string;
    readonly port: number;
    readonly baseUrl: string;
    close(): Promise<void>;
}
export declare function startLocalAuthProxy(options: LocalAuthProxyOptions): Promise<LocalAuthProxyHandle>;
