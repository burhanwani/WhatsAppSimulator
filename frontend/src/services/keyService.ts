/**
 * Key Service API Client
 * Handles public key upload and retrieval
 */

const KEY_SERVICE_URL = 'http://localhost:5001';

export async function uploadPublicKey(userId: string, publicKey: string): Promise<void> {
    const response = await fetch(`${KEY_SERVICE_URL}/keys`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            public_key: publicKey,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to upload public key: ${response.statusText}`);
    }
}

export async function fetchPublicKey(userId: string): Promise<string> {
    const response = await fetch(`${KEY_SERVICE_URL}/keys/${userId}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch public key: ${response.statusText}`);
    }

    const data = await response.json();
    return data.public_key;
}
