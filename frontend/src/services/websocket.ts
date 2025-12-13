/**
 * WebSocket Manager for real-time messaging with JWT authentication
 */

import { AuthService } from './auth';
import { messageFlowTracker } from './messageFlowTracker';

export interface Message {
    message_id: string;
    sender_id: string;
    recipient_id: string;
    encrypted_payload: string;
    encrypted_key: string;
    timestamp?: number;
}

export class WebSocketManager {
    private ws: WebSocket | null = null;
    private userId: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private messageHandlers: Array<(message: Message) => void> = [];
    private connectionHandlers: Array<(connected: boolean) => void> = [];

    constructor(userId: string) {
        this.userId = userId;
    }

    async connect(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                // Get JWT token for WebSocket authentication
                const token = await AuthService.getValidToken();

                // Track WebSocket JWT authentication
                const messageId = 'ws-auth-' + this.userId + '-' + Date.now();
                messageFlowTracker.captureMessage({
                    messageId,
                    sender: this.userId,
                    recipient: 'connection-service',
                    originalMessage: 'WebSocket Authentication',
                    timestamp: Date.now(),
                    encryption: { aesKey: '', encryptedPayload: '', encryptedKey: '' },
                    serviceData: {},
                    currentStep: 1,
                    steps: [{
                        stepNumber: 1,
                        timestamp: Date.now(),
                        service: 'connection-service',
                        action: 'WebSocket JWT Validation',
                        data: { userId: this.userId, protocol: 'websocket' },
                        encryptionLayers: ['jwt', 'tls'],
                        jwtData: {
                            token: token.substring(0, 20) + '...',
                            username: this.userId,
                        },
                    }],
                });

                const wsUrl = `ws://localhost:8000/ws/${this.userId}?token=${encodeURIComponent(token)}`;
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log(`[${this.userId}] WebSocket connected`);
                    this.reconnectAttempts = 0;
                    this.notifyConnectionHandlers(true);
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.notifyMessageHandlers(data);
                    } catch (error) {
                        console.error(`[${this.userId}] Failed to parse message:`, error);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error(`[${this.userId}] WebSocket error:`, error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log(`[${this.userId}] WebSocket closed`);
                    this.notifyConnectionHandlers(false);
                    this.attemptReconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`[${this.userId}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

            setTimeout(() => {
                this.connect().catch(console.error);
            }, delay);
        }
    }

    send(message: Message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            console.log(`[${this.userId}] Sent message:`, message);
        } else {
            console.error(`[${this.userId}] WebSocket not connected`);
        }
    }

    onMessage(handler: (message: Message) => void) {
        this.messageHandlers.push(handler);
    }

    onConnectionChange(handler: (connected: boolean) => void) {
        this.connectionHandlers.push(handler);
    }

    private notifyMessageHandlers(message: Message) {
        this.messageHandlers.forEach(handler => handler(message));
    }

    private notifyConnectionHandlers(connected: boolean) {
        this.connectionHandlers.forEach(handler => handler(connected));
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}
