/**
 * ActivityLog
 *
 * Audit log for fetchWithAuth/fetchAndAddSecret/fetchAndUpdateSecret. Separate from vault.
 * No sensitive data. For dashboard/UI display. Optional, can be disabled.
 * First line is metadata (_meta) for consumer identification.
 */
const NEWLINE = '\n';
export async function appendActivityLog(storage, key, entry, metadata) {
    let existing = await storage.read(key);
    if ((!existing || existing.length === 0) && metadata) {
        const metaLine = JSON.stringify({ _meta: metadata }) + NEWLINE;
        existing = Buffer.from(metaLine, 'utf8');
    }
    const line = JSON.stringify(entry) + NEWLINE;
    const next = existing ? Buffer.concat([existing, Buffer.from(line, 'utf8')]) : Buffer.from(line, 'utf8');
    await storage.write(key, next);
}
export async function readActivityLog(storage, key) {
    const buf = await storage.read(key);
    if (!buf || buf.length === 0)
        return [];
    const text = buf.toString('utf8');
    const lines = text.split(NEWLINE).filter(Boolean);
    return lines
        .map((l) => {
        const raw = JSON.parse(l);
        if (raw._meta)
            return null;
        const secretName = raw.secretName ?? raw.alias;
        return { ...raw, secretName };
    })
        .filter((e) => e !== null);
}
export async function readActivityLogMetadata(storage, key) {
    const buf = await storage.read(key);
    if (!buf || buf.length === 0)
        return null;
    const firstLine = buf.toString('utf8').split(NEWLINE)[0];
    if (!firstLine)
        return null;
    const raw = JSON.parse(firstLine);
    const meta = raw._meta;
    return meta && typeof meta.agentId === 'string' && typeof meta.vaultPath === 'string' ? meta : null;
}
//# sourceMappingURL=ActivityLog.js.map