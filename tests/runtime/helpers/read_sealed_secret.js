import crypto from "node:crypto";
import { unsealBlob } from "../../../dist/sealed/index.js";

export async function readSealedSecret(identity, secretName) {
    const kdk = crypto.randomBytes(32).toString("base64url");
    const sealed = identity.admin.vault.seal(kdk);
    const payload = unsealBlob(sealed, kdk);
    const metadata = payload.secretMetadata?.[secretName];
    if (!metadata || typeof metadata !== "object") {
        return undefined;
    }
    const activeVersion = metadata.activeVersion;
    const version = metadata.versions?.[activeVersion];
    const storageKey = version?.storageKey;
    return typeof storageKey === "string" ? payload.secrets?.[storageKey] : undefined;
}
