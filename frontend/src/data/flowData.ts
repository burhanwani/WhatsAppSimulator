import { ServiceBlock, Connection } from '@/types/flow';

// Complete service data for Phase 1: Message Flow
export const messageFlowServices: ServiceBlock[] = [
    // Row 1: Alice → Connection Service → Kafka
    {
        id: 'alice',
        name: "Alice's Browser",
        type: 'browser',
        position: { x: 50, y: 50 },
        phase: 'message',
        hasEnvoy: false,
        connections: ['connection-service-1'],
        data: {
            title: "Alice's Browser",
            state: 'idle',
            sections: [
                {
                    icon: '🔑',
                    title: 'E2EE Encryption',
                    items: [
                        { label: 'Original', value: 'Hello Bob!', type: 'text' },
                        { label: 'Algorithm', value: 'RSA-2048 + AES-256', type: 'text' },
                        { label: 'Encrypted', value: 'U2FsdGVkX1+...', type: 'code' },
                        { label: 'Time', value: '12ms', type: 'badge' },
                    ],
                },
            ],
        },
    },
    {
        id: 'connection-service-1',
        name: 'Connection Service',
        type: 'connection-service',
        position: { x: 300, y: 50 },
        phase: 'message',
        hasEnvoy: true,
        connections: ['kafka-incoming'],
        data: {
            title: 'Connection Service',
            state: 'idle',
            sections: [
                {
                    icon: '🔐',
                    title: 'mTLS',
                    items: [
                        { label: 'Client Cert', value: 'alice-browser', type: 'text' },
                        { label: 'Verified', value: '✓', type: 'status' },
                    ],
                },
                {
                    icon: '📨',
                    title: 'WebSocket',
                    items: [
                        { label: 'Connection', value: 'ws-abc123', type: 'code' },
                        { label: 'Status', value: 'Active', type: 'badge' },
                    ],
                },
            ],
        },
    },
    {
        id: 'kafka-incoming',
        name: 'Kafka (Incoming)',
        type: 'kafka',
        position: { x: 550, y: 50 },
        phase: 'message',
        hasEnvoy: true,
        connections: ['chat-processor'],
        data: {
            title: 'Kafka',
            state: 'idle',
            sections: [
                {
                    icon: '📮',
                    title: 'Message Broker',
                    items: [
                        { label: 'Topic', value: 'incoming-messages', type: 'text' },
                        { label: 'Partition', value: '0', type: 'badge' },
                        { label: 'Offset', value: '#12345', type: 'code' },
                    ],
                },
            ],
        },
    },

    // Row 2: Chat Processor branches to KMS and DB
    {
        id: 'chat-processor',
        name: 'Chat Processor',
        type: 'chat-processor',
        position: { x: 800, y: 50 },
        phase: 'message',
        hasEnvoy: true,
        connections: ['kms', 'postgres'],
        data: {
            title: 'Chat Processor',
            state: 'idle',
            sections: [
                {
                    icon: '⚙️',
                    title: 'Processing',
                    items: [
                        { label: 'Status', value: 'Processing...', type: 'badge' },
                        { label: 'KMS Call', value: 'Pending', type: 'text' },
                    ],
                },
            ],
        },
    },
    {
        id: 'kms',
        name: 'KMS (LocalStack)',
        type: 'kms',
        position: { x: 950, y: 200 },
        phase: 'message',
        hasEnvoy: true,
        connections: [],
        data: {
            title: 'KMS',
            state: 'idle',
            sections: [
                {
                    icon: '🔑',
                    title: 'Key Management',
                    items: [
                        { label: 'Operation', value: 'GenerateDataKey', type: 'text' },
                        { label: 'Master Key', value: 'kms-master-key', type: 'code' },
                        { label: 'Data Key', value: '[256-bit AES]', type: 'badge' },
                    ],
                },
            ],
        },
    },
    {
        id: 'postgres',
        name: 'PostgreSQL',
        type: 'database',
        position: { x: 700, y: 200 },
        phase: 'message',
        hasEnvoy: true,
        connections: ['kafka-outgoing'],
        data: {
            title: 'PostgreSQL',
            state: 'idle',
            sections: [
                {
                    icon: '💾',
                    title: 'Storage',
                    items: [
                        { label: 'Table', value: 'messages', type: 'text' },
                        { label: 'Encrypted', value: 'Double (E2EE + KMS)', type: 'badge' },
                        { label: 'Row ID', value: '12345', type: 'code' },
                    ],
                },
            ],
        },
    },

    // Row 3: Return path through Kafka and Connection Service to Bob
    {
        id: 'kafka-outgoing',
        name: 'Kafka (Outgoing)',
        type: 'kafka',
        position: { x: 550, y: 350 },
        phase: 'message',
        hasEnvoy: true,
        connections: ['connection-service-2'],
        data: {
            title: 'Kafka',
            state: 'idle',
            sections: [
                {
                    icon: '📮',
                    title: 'Message Delivery',
                    items: [
                        { label: 'Topic', value: 'outgoing-messages', type: 'text' },
                        { label: 'Recipient', value: 'bob', type: 'badge' },
                        { label: 'Offset', value: '#12346', type: 'code' },
                    ],
                },
            ],
        },
    },
    {
        id: 'connection-service-2',
        name: 'Connection Service',
        type: 'connection-service',
        position: { x: 300, y: 350 },
        phase: 'message',
        hasEnvoy: true,
        connections: ['bob'],
        data: {
            title: 'Connection Service',
            state: 'idle',
            sections: [
                {
                    icon: '📨',
                    title: 'WebSocket',
                    items: [
                        { label: 'Connection', value: 'ws-def456', type: 'code' },
                        { label: 'User', value: 'bob', type: 'badge' },
                    ],
                },
            ],
        },
    },
    {
        id: 'bob',
        name: "Bob's Browser",
        type: 'browser',
        position: { x: 50, y: 350 },
        phase: 'message',
        hasEnvoy: false,
        connections: [],
        data: {
            title: "Bob's Browser",
            state: 'idle',
            sections: [
                {
                    icon: '🔓',
                    title: 'E2EE Decryption',
                    items: [
                        { label: 'Encrypted', value: 'U2FsdGVkX1+...', type: 'code' },
                        { label: 'Decrypted', value: 'Hello Bob!', type: 'text' },
                        { label: 'Verified', value: '✓', type: 'status' },
                    ],
                },
            ],
        },
    },
];

// Infrastructure services (shown in sidebar during message flow)
export const infrastructureServices: ServiceBlock[] = [
    {
        id: 'keycloak',
        name: 'Keycloak',
        type: 'keycloak',
        position: { x: 1150, y: 50 },
        phase: 'setup',
        hasEnvoy: false,
        connections: [],
        data: {
            title: 'Keycloak',
            state: 'grayed',
            sections: [
                {
                    icon: '🔐',
                    title: 'Auth Status',
                    items: [
                        { label: 'Alice', value: 'Authenticated ✓', type: 'status' },
                        { label: 'Bob', value: 'Authenticated ✓', type: 'status' },
                    ],
                },
            ],
        },
    },
    {
        id: 'redis',
        name: 'Redis',
        type: 'redis',
        position: { x: 1150, y: 180 },
        phase: 'setup',
        hasEnvoy: false,
        connections: [],
        data: {
            title: 'Redis',
            state: 'grayed',
            sections: [
                {
                    icon: '⚡',
                    title: 'Cache',
                    items: [
                        { label: 'Hits', value: '3', type: 'badge' },
                        { label: 'Keys Cached', value: '2', type: 'text' },
                    ],
                },
            ],
        },
    },
    {
        id: 'istio',
        name: 'Istio',
        type: 'istio',
        position: { x: 1150, y: 310 },
        phase: 'setup',
        hasEnvoy: false,
        connections: [],
        data: {
            title: 'Istio',
            state: 'grayed',
            sections: [
                {
                    icon: '🌐',
                    title: 'Service Mesh',
                    items: [
                        { label: 'mTLS', value: 'Active', type: 'badge' },
                        { label: 'Services', value: '6', type: 'text' },
                    ],
                },
            ],
        },
    },
];

// Connection paths for message flow
export const messageFlowConnections: Connection[] = [
    {
        id: 'alice-to-conn',
        from: 'alice',
        to: 'connection-service-1',
        protocol: 'https',
        encryptionLayer: 'tls',
        active: false,
        path: 'M 250 100 L 300 100', // Simple line for now
    },
    {
        id: 'conn-to-kafka-in',
        from: 'connection-service-1',
        to: 'kafka-incoming',
        protocol: 'mtls',
        encryptionLayer: 'mtls',
        active: false,
        path: 'M 500 100 L 550 100',
    },
    {
        id: 'kafka-in-to-processor',
        from: 'kafka-incoming',
        to: 'chat-processor',
        protocol: 'mtls',
        encryptionLayer: 'mtls',
        active: false,
        path: 'M 750 100 L 800 100',
    },
    {
        id: 'processor-to-kms',
        from: 'chat-processor',
        to: 'kms',
        protocol: 'mtls',
        encryptionLayer: 'kms',
        active: false,
        path: 'M 900 150 L 950 200',
    },
    {
        id: 'processor-to-db',
        from: 'chat-processor',
        to: 'postgres',
        protocol: 'mtls',
        encryptionLayer: 'mtls',
        active: false,
        path: 'M 850 150 L 800 200',
    },
    {
        id: 'db-to-kafka-out',
        from: 'postgres',
        to: 'kafka-outgoing',
        protocol: 'mtls',
        encryptionLayer: 'mtls',
        active: false,
        path: 'M 700 300 L 650 350',
    },
    {
        id: 'kafka-out-to-conn',
        from: 'kafka-outgoing',
        to: 'connection-service-2',
        protocol: 'mtls',
        encryptionLayer: 'mtls',
        active: false,
        path: 'M 550 400 L 500 400',
    },
    {
        id: 'conn-to-bob',
        from: 'connection-service-2',
        to: 'bob',
        protocol: 'https',
        encryptionLayer: 'tls',
        active: false,
        path: 'M 300 400 L 250 400',
    },
];

// Flow steps defining the animation sequence
export const messageFlowSteps = [
    { service: 'alice', action: 'Encrypting message with E2EE', connection: null },
    { service: 'alice', action: 'Sending to Connection Service', connection: 'alice-to-conn' },
    { service: 'connection-service-1', action: 'Receiving via WebSocket', connection: 'conn-to-kafka-in' },
    { service: 'kafka-incoming', action: 'Queuing message', connection: 'kafka-in-to-processor' },
    { service: 'chat-processor', action: 'Processing message', connection: 'processor-to-kms' },
    { service: 'kms', action: 'Generating data key', connection: null },
    { service: 'chat-processor', action: 'Encrypting with KMS', connection: 'processor-to-db' },
    { service: 'postgres', action: 'Storing encrypted message', connection: 'db-to-kafka-out' },
    { service: 'kafka-outgoing', action: 'Queuing for delivery', connection: 'kafka-out-to-conn' },
    { service: 'connection-service-2', action: 'Delivering to Bob', connection: 'conn-to-bob' },
    { service: 'bob', action: 'Decrypting message', connection: null },
];
