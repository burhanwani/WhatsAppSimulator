/**
 * Key Service API
 * Handles public key upload and retrieval with JWT authentication
 */

import { AuthService } from './auth';

const KEY_SERVICE_URL = 'http://localhost:5001';

export async function uploadPublicKey(userId: string, publicKey: string): Promise<void> {
    try {
        // Get auth headers (includes Bearer token)
        const authHeaders = await AuthService.getAuthHeaders();

        const response = await fetch(`${KEY_SERVICE_URL}/keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,  // Add Authorization: Bearer <token>
            },
            body: JSON.stringify({
                user_id: userId,
                public_key: publicKey,
            }),
        });

        if (response.status === 401) {
            // Token expired, try to refresh and retry
            console.log('🔄 Token expired, refreshing...');
            await AuthService.refreshToken();
            return uploadPublicKey(userId, publicKey);  // Retry with new token
        }

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to upload public key: ${error}`);
        }

        console.log(`✅ Public key uploaded for ${userId}`);
    } catch (error) {
        console.error('Failed to upload public key:', error);
        throw error;
    }
}

export async function fetchPublicKey(userId: string): Promise<string> {
    try {
        // Get auth headers (includes Bearer token)
        const authHeaders = await AuthService.getAuthHeaders();

        const response = await fetch(`${KEY_SERVICE_URL}/keys/${userId}`, {
            headers: {
                ...authHeaders,  // Add Authorization: Bearer <token>
            },
        });

        if (response.status === 401) {
            // Token expired, try to refresh and retry
            console.log('🔄 Token expired, refreshing...');
            await AuthService.refreshToken();
            return fetchPublicKey(userId);  // Retry with new token
        }

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to fetch public key: ${error}`);
        }

        const data = await response.json();
        console.log(`✅ Public key fetched for ${userId}`);
        return data.public_key;
    } catch (error) {
        console.error('Failed to fetch public key:', error);
        throw error;
    }
}
