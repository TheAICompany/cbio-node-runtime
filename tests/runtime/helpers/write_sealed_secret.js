import crypto from "node:crypto";
import { sealBlob, unsealBlob } from "../../../dist/sealed/index.js";

export async function writeSealedSecret(identity, secretName, secretValue) {
    const kdk = crypto.randomBytes(32).toString("base64url");
    const sealed = identity.admin.vault.seal(kdk);
    const payload = unsealBlob(sealed, kdk);
    const metadata = payload.secretMetadata?.[secretName];
    if (metadata && typeof metadata === "object") {
        const activeVersion = metadata.activeVersion;
        const version = metadata.versions?.[activeVersion];
        const storageKey = version?.storageKey;
        if (typeof storageKey === "string") {
            payload.secrets[storageKey] = secretValue;
        }
    } else {
        const versionId = "v1";
        const storageKey = `__cbio_secret_version__:${secretName}:${versionId}`;
        payload.secrets[storageKey] = secretValue;
        payload.secretMetadata[secretName] = {
            activeVersion: versionId,
            nextVersionNumber: 2,
            versions: {
                [versionId]: {
                    storageKey,
                    state: "active",
                    createdAt: Date.now(),
                },
            },
        };
    }
    identity.admin.vault.loadFromSealedBlob(kdk, sealBlob(payload, kdk));
}

export async function deleteSealedSecret(identity, secretName) {
    const kdk = crypto.randomBytes(32).toString("base64url");
    const sealed = identity.admin.vault.seal(kdk);
    const payload = unsealBlob(sealed, kdk);
    const metadata = payload.secretMetadata?.[secretName];
    if (metadata && typeof metadata === "object") {
        for (const version of Object.values(metadata.versions ?? {})) {
            if (version && typeof version === "object" && typeof version.storageKey === "string") {
                delete payload.secrets[version.storageKey];
            }
        }
        delete payload.secretMetadata[secretName];
    }
    identity.admin.vault.loadFromSealedBlob(kdk, sealBlob(payload, kdk));
}
