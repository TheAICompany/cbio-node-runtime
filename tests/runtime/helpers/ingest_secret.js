export async function ingestSecret(identityOrAgent, secretName, secretValue, options = {}) {
    const ingress = await identityOrAgent.startLocalSecretIngress({
        secretName,
        ...options,
    });

    try {
        const response = await fetch(ingress.url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ingress.authToken}`,
                "Content-Type": "text/plain",
            },
            body: secretValue,
        });
        if (response.status !== 201) {
            throw new Error(`Secret ingest failed with status ${response.status}`);
        }
        await ingress.waitForSecret();
    } finally {
        await ingress.close().catch(() => {});
    }
}
