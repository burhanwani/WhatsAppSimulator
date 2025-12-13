import { FlowStep, EncryptionLayer } from '@/types/flow';

export interface MessageFlowData {
    messageId: string;
    sender: string;
    recipient: string;
    originalMessage: string;
    timestamp: number;

    // Encryption data
    encryption: {
        aesKey: string;
        encryptedPayload: string;
        encryptedKey: string;
    };

    // Service-specific data
    serviceData: {
        connectionService?: {
            websocketId: string;
            receivedAt: number;
        };
        kafka?: {
            topic: string;
            partition: number;
            offset: number;
        };
        chatProcessor?: {
            processedAt: number;
        };
        kms?: {
            dataKey: string;
            masterKey: string;
        };
        database?: {
            rowId: number;
            storedAt: number;
        };
    };

    // Authentication data
    authData?: {
        username: string;
        loginTimestamp: number;
        token: string;  // Truncated JWT
        tokenExpiry: number;
    };

    // Flow tracking
    currentStep: number;
    steps: FlowStep[];
}

// Global state for capturing message flows
class MessageFlowTracker {
    private flows: Map<string, MessageFlowData> = new Map();
    private listeners: Set<(messageId: string, data: MessageFlowData) => void> = new Set();

    captureMessage(data: Partial<MessageFlowData> & { messageId: string }) {
        console.log('[TRACKER DEBUG] captureMessage called with:', data);

        const existing = this.flows.get(data.messageId) || {
            messageId: data.messageId,
            sender: '',
            recipient: '',
            originalMessage: '',
            timestamp: Date.now(),
            encryption: {
                aesKey: '',
                encryptedPayload: '',
                encryptedKey: '',
            },
            serviceData: {},
            currentStep: 0,
            steps: [],
        };

        const updated = { ...existing, ...data };
        console.log('[TRACKER DEBUG] Updated flow data:', updated);
        console.log('[TRACKER DEBUG] Number of listeners:', this.listeners.size);

        this.flows.set(data.messageId, updated);
        this.notifyListeners(data.messageId, updated);
    }

    updateService(messageId: string, service: string, data: any) {
        const existing = this.flows.get(messageId);
        if (existing) {
            existing.serviceData = {
                ...existing.serviceData,
                [service]: data,
            };
            this.flows.set(messageId, existing);
            this.notifyListeners(messageId, existing);
        }
    }

    getFlow(messageId: string): MessageFlowData | undefined {
        return this.flows.get(messageId);
    }

    /**
     * Get the latest captured flow
     */
    getLatestFlow(): MessageFlowData | null {
        if (this.flows.size === 0) return null;
        const lastKey = Array.from(this.flows.keys()).pop();
        return lastKey ? this.flows.get(lastKey) || null : null;
    }

    /**
     * Get all captured flows
     */
    getAllFlows(): MessageFlowData[] {
        return Array.from(this.flows.values());
    }

    subscribe(callback: (messageId: string, data: MessageFlowData) => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(messageId: string, data: MessageFlowData) {
        console.log('[TRACKER DEBUG] notifyListeners called with:', messageId);
        console.log('[TRACKER DEBUG] Notifying', this.listeners.size, 'listeners');
        this.listeners.forEach((listener, index) => {
            console.log('[TRACKER DEBUG] Calling listener', index);
            listener(messageId, data);
        });
    }

    clear() {
        this.flows.clear();
    }
}

export const messageFlowTracker = new MessageFlowTracker();

// Expose debug methods to browser console for verification
if (typeof window !== 'undefined') {
    (window as any).debugJWTFlows = {
        getAllFlows: () => messageFlowTracker.getAllFlows(),
        getJWTFlows: () => {
            const allFlows = messageFlowTracker.getAllFlows();
            return allFlows.filter(f =>
                f.messageId.includes('jwt-login') ||
                f.messageId.includes('key-upload') ||
                f.messageId.includes('key-fetch') ||
                f.messageId.includes('ws-auth')
            );
        },
        getLoginFlows: () => {
            const allFlows = messageFlowTracker.getAllFlows();
            return allFlows.filter(f => f.messageId.includes('jwt-login'));
        },
        printFlowSummary: () => {
            const allFlows = messageFlowTracker.getAllFlows();
            const jwtFlows = allFlows.filter(f =>
                f.messageId.includes('jwt-login') ||
                f.messageId.includes('key-upload') ||
                f.messageId.includes('key-fetch') ||
                f.messageId.includes('ws-auth')
            );
            console.log('='.repeat(50));
            console.log('JWT Flow Debug Summary');
            console.log('='.repeat(50));
            console.log('Total flows:', allFlows.length);
            console.log('JWT-related flows:', jwtFlows.length);
            console.log('  - jwt-login:', allFlows.filter(f => f.messageId.includes('jwt-login')).length);
            console.log('  - key-upload:', allFlows.filter(f => f.messageId.includes('key-upload')).length);
            console.log('  - key-fetch:', allFlows.filter(f => f.messageId.includes('key-fetch')).length);
            console.log('  - ws-auth:', allFlows.filter(f => f.messageId.includes('ws-auth')).length);
            console.log('='.repeat(50));
            if (jwtFlows.length > 0) {
                console.log('JWT Flows:');
                jwtFlows.forEach((f, i) => {
                    console.log(`  ${i + 1}. ${f.messageId} (sender: ${f.sender})`);
                });
            }
            return { total: allFlows.length, jwt: jwtFlows.length };
        },
    };
    console.log('🔍 [DEBUG] JWT Flow debug methods available at window.debugJWTFlows');
    console.log('   - debugJWTFlows.printFlowSummary()');
    console.log('   - debugJWTFlows.getAllFlows()');
    console.log('   - debugJWTFlows.getJWTFlows()');
    console.log('   - debugJWTFlows.getLoginFlows()');
}
