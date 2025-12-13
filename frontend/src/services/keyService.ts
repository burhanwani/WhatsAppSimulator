/**
 * Key Service API
 * Handles public key upload and retrieval with JWT authentication
 */

import { AuthService } from './auth';
import { messageFlowTracker } from './messageFlowTracker';

const KEY_SERVICE_URL = 'http://localhost:5000';

export async function uploadPublicKey(userId: string, publicKey: string): Promise<void> {
    try {
        // Get auth headers (includes Bearer token)
        const authHeaders = await AuthService.getAuthHeaders();
        const token = await AuthService.getValidToken();

        // Track JWT usage in API call
        const messageId = 'key-upload-' + userId + '-' + Date.now();
        messageFlowTracker.captureMessage({
            messageId,
            sender: userId,
            recipient: 'key-service',
            originalMessage: 'Public Key Upload',
            timestamp: Date.now(),
            encryption: { aesKey: '', encryptedPayload: '', encryptedKey: '' },
            serviceData: {},
            currentStep: 1,
            steps: [{
                stepNumber: 1,
                timestamp: Date.now(),
                service: 'key-service',
                action: 'API Call with JWT',
                data: { endpoint: '/keys', method: 'POST', userId },
                encryptionLayers: ['jwt', 'tls'],
                jwtData: {
                    token: token.substring(0, 20) + '...',
                    username: userId,
                },
            }],
        });

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
        const token = await AuthService.getValidToken();
        const currentUser = AuthService.getUsername() || 'unknown';

        // Track JWT usage in API call
        const messageId = 'key-fetch-' + userId + '-' + Date.now();
        messageFlowTracker.captureMessage({
            messageId,
            sender: currentUser,
            recipient: 'key-service',
            originalMessage: 'Fetch Public Key',
            timestamp: Date.now(),
            encryption: { aesKey: '', encryptedPayload: '', encryptedKey: '' },
            serviceData: {},
            currentStep: 1,
            steps: [{
                stepNumber: 1,
                timestamp: Date.now(),
                service: 'key-service',
                action: 'API GET with JWT',
                data: { endpoint: `/keys/${userId}`, method: 'GET' },
                encryptionLayers: ['jwt', 'tls'],
                jwtData: {
                    token: token.substring(0, 20) + '...',
                    username: currentUser,
                },
            }],
        });

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
