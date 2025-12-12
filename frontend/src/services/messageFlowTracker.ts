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

    getLatestFlow(): MessageFlowData | undefined {
        const flows = Array.from(this.flows.values());
        return flows.length > 0 ? flows[flows.length - 1] : undefined;
    }

    subscribe(callback: (messageId: string, data: MessageFlowData) => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(messageId: string, data: MessageFlowData) {
        console.log('[TRACKER DEBUG] notifyListeners called with messageId:', messageId);
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
