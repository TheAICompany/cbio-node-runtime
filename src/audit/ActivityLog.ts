/**
 * ActivityLog
 *
 * Audit log for fetchWithAuth/fetchJsonAndAddSecret/fetchJsonAndUpdateSecret. Separate from vault.
 * No sensitive data. For dashboard/UI display. Optional, can be disabled.
 * First line is metadata (_meta) for consumer identification.
 */

import type { IStorageProvider } from '../storage/provider.js';

export interface ActivityLogMetadata {
    v: number;
    agentId: string;
    storageKey: string;
}

export interface ActivityLogEntry {
    ts: number;
    action: 'fetchWithAuth' | 'fetchJsonAndAddSecret' | 'fetchJsonAndUpdateSecret' | 'compareSecret' | 'proveSecret' | 'validateSecret';
    secretName: string;
    url: string;
    method: string;
    success: boolean;
    error?: string;
}

interface RawActivityLogEntry {
    ts?: unknown;
    action?: unknown;
    secretName?: unknown;
    alias?: unknown;
    url?: unknown;
    method?: unknown;
    success?: unknown;
    error?: unknown;
}

const NEWLINE = '\n';

export async function appendActivityLog(
    storage: IStorageProvider,
    key: string,
    entry: ActivityLogEntry,
    metadata?: ActivityLogMetadata
): Promise<void> {
    let existing = await storage.read(key);
    if ((!existing || existing.length === 0) && metadata) {
        const metaLine = JSON.stringify({ _meta: metadata }) + NEWLINE;
        existing = Buffer.from(metaLine, 'utf8');
    }
    const line = JSON.stringify(entry) + NEWLINE;
    const next = existing ? Buffer.concat([existing, Buffer.from(line, 'utf8')]) : Buffer.from(line, 'utf8');
    await storage.write(key, next);
}

export async function readActivityLog(
    storage: IStorageProvider,
    key: string
): Promise<ActivityLogEntry[]> {
    const buf = await storage.read(key);
    if (!buf || buf.length === 0) return [];
    const text = buf.toString('utf8');
    const lines = text.split(NEWLINE).filter(Boolean);
    return lines
        .map((l) => {
            const raw = JSON.parse(l) as RawActivityLogEntry & { _meta?: unknown };
            if (raw._meta) return null;
            const secretName = raw.secretName ?? raw.alias;
            if (typeof raw.ts !== 'number') return null;
            if (
                raw.action !== 'fetchWithAuth' &&
                raw.action !== 'fetchJsonAndAddSecret' &&
                raw.action !== 'fetchJsonAndUpdateSecret' &&
                raw.action !== 'compareSecret' &&
                raw.action !== 'proveSecret' &&
                raw.action !== 'validateSecret'
            ) return null;
            if (typeof secretName !== 'string') return null;
            if (typeof raw.url !== 'string') return null;
            if (typeof raw.method !== 'string') return null;
            if (typeof raw.success !== 'boolean') return null;
            return {
                ts: raw.ts,
                action: raw.action,
                secretName,
                url: raw.url,
                method: raw.method,
                success: raw.success,
                ...(typeof raw.error === 'string' ? { error: raw.error } : {}),
            } satisfies ActivityLogEntry;
        })
        .filter((e): e is ActivityLogEntry => e !== null);
}

export async function readActivityLogMetadata(
    storage: IStorageProvider,
    key: string
): Promise<ActivityLogMetadata | null> {
    const buf = await storage.read(key);
    if (!buf || buf.length === 0) return null;
    const firstLine = buf.toString('utf8').split(NEWLINE)[0];
    if (!firstLine) return null;
    const raw = JSON.parse(firstLine) as Record<string, unknown>;
    const meta = raw._meta as ActivityLogMetadata | undefined;
    return meta && typeof meta.agentId === 'string' && typeof meta.storageKey === 'string' ? meta : null;
}
