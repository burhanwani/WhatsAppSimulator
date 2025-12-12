// Type definitions for the Visual Flow System

export type ServiceType =
    | 'browser'
    | 'key-service'
    | 'connection-service'
    | 'kafka'
    | 'chat-processor'
    | 'kms'
    | 'database'
    | 'keycloak'
    | 'redis'
    | 'istio'
    | 'envoy';

export type EncryptionLayer = 'e2ee' | 'tls' | 'mtls' | 'kms';

export type FlowPhase = 'setup' | 'message';

export interface ServiceBlock {
    id: string;
    name: string;
    type: ServiceType;
    position: { x: number; y: number };
    phase: FlowPhase;
    data: ServiceData;
    hasEnvoy?: boolean;
    connections: string[]; // Array of connection IDs (not Connection objects)
}

export interface ServiceData {
    title: string;
    sections: Section[];
    state: ServiceState;
}

export interface Section {
    icon: string;
    title: string;
    items: DataItem[];
}

export interface DataItem {
    label: string;
    value: string;
    type: 'text' | 'badge' | 'code' | 'status';
    tooltip?: string;
}

export type ServiceState = 'idle' | 'active' | 'processing' | 'complete' | 'grayed';

export interface Connection {
    id: string;
    from: string;
    to: string;
    protocol: 'websocket' | 'mtls' | 'https' | 'http';
    encryptionLayer: EncryptionLayer;
    active: boolean;
    path?: string; // SVG path for connection line
}

export interface FlowStep {
    stepNumber: number;
    timestamp: number;
    service: string;
    action: string;
    data: Record<string, any>;
    encryptionLayers: EncryptionLayer[];
}

export interface FlowData {
    messageId: string;
    phase: FlowPhase;
    steps: FlowStep[];
    serviceData: Record<string, ServiceData>;
    currentStep: number;
}

export interface AnimationConfig {
    duration: number;
    particleSpeed: number;
    glowIntensity: number;
    autoPlay: boolean;
    playbackSpeed: number; // 0.5, 1, 2
}

// Phase 0: Infrastructure Setup
export interface SetupLayer {
    id: string;
    name: string;
    description: string;
    services: string[]; // Service IDs involved
    complete: boolean;
    color: string;
}

// Phase 1: Message Flow
export interface MessageFlow {
    sender: string;
    recipient: string;
    message: string;
    encrypted: {
        e2ee: string;
        kms: string;
    };
    path: string[]; // Array of service IDs
}
