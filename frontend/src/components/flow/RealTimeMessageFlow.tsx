import { useState, useEffect } from 'react';
import { FlowCanvas } from './FlowCanvas';
import { ServiceBlock } from './ServiceBlock';
import { EnvoyWrapper } from './EnvoyWrapper';
import { ConnectionLine } from './ConnectionLine';
import { DataParticle } from './DataParticle';
import { FlowControls } from './FlowControls';
import { messageFlowTracker, MessageFlowData } from '@/services/messageFlowTracker';
import { Connection, ServiceBlock as ServiceBlockType } from '@/types/flow';

export function RealTimeMessageFlow() {
    const [currentFlow, setCurrentFlow] = useState<MessageFlowData | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);

    // DEBUG: Log component mount
    useEffect(() => {
        console.log('[FLOW DEBUG] RealTimeMessageFlow component mounted');
        return () => {
            console.log('[FLOW DEBUG] RealTimeMessageFlow component unmounted');
        };
    }, []);

    // Subscribe to message flow updates
    useEffect(() => {
        console.log('[FLOW DEBUG] Setting up subscription to messageFlowTracker');

        const unsubscribe = messageFlowTracker.subscribe((_messageId, data) => {
            console.log('[FLOW DEBUG] Subscription callback fired!');
            console.log('[FLOW DEBUG] Received data:', data);
            setCurrentFlow(data);
            setCurrentStep(0);
            setIsPlaying(true); // Auto-play when new message comes in
        });

        // Check if there's already a flow captured
        const latestFlow = messageFlowTracker.getLatestFlow();
        console.log('[FLOW DEBUG] Checking for existing flow on mount:', latestFlow);
        if (latestFlow) {
            console.log('[FLOW DEBUG] Found existing flow, setting it');
            setCurrentFlow(latestFlow);
        }

        return () => {
            console.log('[FLOW DEBUG] Unsubscribing from messageFlowTracker');
            unsubscribe();
        };
    }, []);

    // DEBUG: Log state changes
    useEffect(() => {
        console.log('[FLOW DEBUG] currentFlow state changed:', currentFlow);
    }, [currentFlow]);

    // Auto-play through steps
    useEffect(() => {
        if (!isPlaying || !currentFlow) return;

        const totalSteps = 11; // Total flow steps
        const interval = setInterval(() => {
            setCurrentStep((prev) => {
                if (prev >= totalSteps - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, (2000 / speed));

        return () => clearInterval(interval);
    }, [isPlaying, speed, currentFlow]);

    // If no message has been sent yet
    if (!currentFlow) {
        console.log('[FLOW DEBUG] Rendering "No Message Sent Yet" screen');
        return (
            <div className="w-full space-y-4">
                <div className="p-8 bg-gray-900 border border-gray-800 rounded-lg text-center">
                    <h2 className="text-xl font-bold text-white mb-2">
                        No Message Sent Yet
                    </h2>
                    <p className="text-gray-400">
                        Send a message from Alice in the Chat Interface to see the real-time flow visualization!
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                        Switch to the <strong>💬 Chat Interface</strong> tab and send a message to begin.
                    </p>
                    <div className="mt-4 p-2 bg-blue-900/20 border border-blue-500 rounded text-xs text-blue-400">
                        DEBUG: Check browser console for [FLOW DEBUG] messages
                    </div>
                </div>
            </div>
        );
    }

    console.log('[FLOW DEBUG] Rendering flow visualization with message:', currentFlow.originalMessage);

    // Define services with real data from the current message
    const services: ServiceBlockType[] = [
        {
            id: 'alice',
            name: "Alice's Browser",
            type: 'browser',
            position: { x: 20, y: 20 },
            phase: 'message',
            hasEnvoy: false,
            connections: ['connection-service-1'],
            data: {
                title: "Alice's Browser",
                state: currentStep === 0 ? 'active' : currentStep > 0 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '🔑',
                        title: 'E2EE Encryption',
                        items: [
                            { label: 'Original', value: currentFlow.originalMessage, type: 'text' },
                            { label: 'Sender', value: currentFlow.sender, type: 'badge' },
                            { label: 'Recipient', value: currentFlow.recipient, type: 'badge' },
                            { label: 'Algorithm', value: 'RSA-2048 + AES-256', type: 'text' },
                            { label: 'Encrypted', value: currentFlow.encryption.encryptedPayload.substring(0, 20) + '...', type: 'code' },
                            { label: 'Enc Key', value: currentFlow.encryption.encryptedKey.substring(0, 20) + '...', type: 'code' },
                            { label: 'Time', value: new Date(currentFlow.timestamp).toLocaleTimeString(), type: 'badge' },
                        ],
                    },
                ],
            },
        },
        {
            id: 'connection-service-1',
            name: 'Connection Service',
            type: 'connection-service',
            position: { x: 340, y: 20 },
            phase: 'message',
            hasEnvoy: true,
            connections: ['kafka-incoming'],
            data: {
                title: 'Connection Service',
                state: currentStep === 1 || currentStep === 2 ? 'active' : currentStep > 2 ? 'complete' : 'idle',
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
                            { label: 'Connection', value: currentFlow.serviceData?.connectionService?.websocketId || 'ws-' + currentFlow.messageId.substring(0, 6), type: 'code' },
                            { label: 'Status', value: 'Active', type: 'badge' },
                            { label: 'Message ID', value: currentFlow.messageId.substring(0, 8), type: 'code' },
                        ],
                    },
                    {
                        icon: '☁️',
                        title: 'Kafka Producer',
                        items: [
                            { label: 'Topic', value: 'incoming-messages', type: 'text' },
                            { label: 'Publishing', value: currentStep >= 2 ? '✓' : '...', type: 'status' },
                        ],
                    },
                ],
            },
        },
        {
            id: 'kafka-incoming',
            name: 'Kafka (Incoming)',
            type: 'kafka',
            position: { x: 660, y: 20 },
            phase: 'message',
            hasEnvoy: true,
            connections: ['chat-processor'],
            data: {
                title: 'Kafka',
                state: currentStep === 3 ? 'active' : currentStep > 3 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '📮',
                        title: 'Message Broker',
                        items: [
                            { label: 'Topic', value: 'incoming-messages', type: 'text' },
                            { label: 'Partition', value: currentFlow.serviceData?.kafka?.partition?.toString() || '0', type: 'badge' },
                            { label: 'Offset', value: '#' + (currentFlow.serviceData?.kafka?.offset || Math.floor(Math.random() * 10000)), type: 'code' },
                            { label: 'Queued', value: currentStep >= 3 ? '✓' : '...', type: 'status' },
                        ],
                    },
                ],
            },
        },
        {
            id: 'chat-processor',
            name: 'Chat Processor',
            type: 'chat-processor',
            position: { x: 980, y: 20 },
            phase: 'message',
            hasEnvoy: true,
            connections: ['kms', 'postgres'],
            data: {
                title: 'Chat Processor',
                state: currentStep === 4 || currentStep === 5 ? 'active' : currentStep > 5 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '⚙️',
                        title: 'Processing',
                        items: [
                            { label: 'Status', value: currentStep >= 4 ? 'Processing' : 'Waiting', type: 'badge' },
                            { label: 'Original Size', value: currentFlow.originalMessage.length + ' chars', type: 'text' },
                            { label: 'Encrypted Size', value: currentFlow.encryption.encryptedPayload.length + ' bytes', type: 'text' },
                        ],
                    },
                ],
            },
        },
        {
            id: 'kms',
            name: 'KMS (LocalStack)',
            type: 'kms',
            position: { x: 1100, y: 260 },
            phase: 'message',
            hasEnvoy: true,
            connections: [],
            data: {
                title: 'KMS',
                state: currentStep === 5 ? 'active' : currentStep > 5 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '🔑',
                        title: 'Key Management',
                        items: [
                            { label: 'Operation', value: 'GenerateDataKey', type: 'text' },
                            { label: 'Master Key', value: 'kms-master-key', type: 'code' },
                            { label: 'Data Key', value: currentFlow.serviceData?.kms?.dataKey || '[256-bit AES]', type: 'badge' },
                            { label: 'Generated', value: currentStep >= 5 ? '✓' : '...', type: 'status' },
                        ],
                    },
                ],
            },
        },
        {
            id: 'postgres',
            name: 'PostgreSQL',
            type: 'database',
            position: { x: 660, y: 260 },
            phase: 'message',
            hasEnvoy: true,
            connections: ['kafka-outgoing'],
            data: {
                title: 'PostgreSQL',
                state: currentStep === 6 || currentStep === 7 ? 'active' : currentStep > 7 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '💾',
                        title: 'Storage',
                        items: [
                            { label: 'Table', value: 'messages', type: 'text' },
                            { label: 'Encryption', value: 'Double (E2EE + KMS)', type: 'badge' },
                            { label: 'Row ID', value: currentFlow.serviceData?.database?.rowId?.toString() || String(Math.floor(Math.random() * 10000)), type: 'code' },
                            { label: 'Sender', value: currentFlow.sender, type: 'text' },
                            { label: 'Recipient', value: currentFlow.recipient, type: 'text' },
                            { label: 'Stored', value: currentStep >= 7 ? '✓' : '...', type: 'status' },
                        ],
                    },
                ],
            },
        },
        {
            id: 'kafka-outgoing',
            name: 'Kafka (Outgoing)',
            type: 'kafka',
            position: { x: 660, y: 500 },
            phase: 'message',
            hasEnvoy: true,
            connections: ['connection-service-2'],
            data: {
                title: 'Kafka',
                state: currentStep === 8 ? 'active' : currentStep > 8 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '📮',
                        title: 'Message Delivery',
                        items: [
                            { label: 'Topic', value: 'outgoing-messages', type: 'text' },
                            { label: 'Recipient', value: currentFlow.recipient, type: 'badge' },
                            { label: 'Offset', value: '#' + String(Math.floor(Math.random() * 10000)), type: 'code' },
                            { label: 'Ready', value: currentStep >= 8 ? '✓' : '...', type: 'status' },
                        ],
                    },
                ],
            },
        },
        {
            id: 'connection-service-2',
            name: 'Connection Service',
            type: 'connection-service',
            position: { x: 340, y: 500 },
            phase: 'message',
            hasEnvoy: true,
            connections: ['bob'],
            data: {
                title: 'Connection Service',
                state: currentStep === 9 ? 'active' : currentStep > 9 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '📨',
                        title: 'WebSocket',
                        items: [
                            { label: 'Connection', value: 'ws-bob-' + currentFlow.messageId.substring(0, 4), type: 'code' },
                            { label: 'User', value: currentFlow.recipient, type: 'badge' },
                            { label: 'Delivering', value: currentStep >= 9 ? '✓' : '...', type: 'status' },
                        ],
                    },
                ],
            },
        },
        {
            id: 'bob',
            name: "Bob's Browser",
            type: 'browser',
            position: { x: 20, y: 500 },
            phase: 'message',
            hasEnvoy: false,
            connections: [],
            data: {
                title: "Bob's Browser",
                state: currentStep === 10 ? 'active' : currentStep > 10 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '🔓',
                        title: 'E2EE Decryption',
                        items: [
                            { label: 'Encrypted', value: currentFlow.encryption.encryptedPayload.substring(0, 20) + '...', type: 'code' },
                            { label: 'Decrypted', value: currentFlow.originalMessage, type: 'text' },
                            { label: 'Sender', value: currentFlow.sender, type: 'badge' },
                            { label: 'Verified', value: currentStep >= 10 ? '✓' : '...', type: 'status' },
                        ],
                    },
                ],
            },
        },
    ];

    // Connection paths (320px spacing)
    const connections: Connection[] = [
        { id: 'alice-to-conn', from: 'alice', to: 'connection-service-1', protocol: 'https', encryptionLayer: 'tls', active: currentStep === 1, path: 'M 270 110 L 340 110' },
        { id: 'conn-to-kafka-in', from: 'connection-service-1', to: 'kafka-incoming', protocol: 'mtls', encryptionLayer: 'mtls', active: currentStep === 2, path: 'M 590 110 L 660 110' },
        { id: 'kafka-in-to-processor', from: 'kafka-incoming', to: 'chat-processor', protocol: 'mtls', encryptionLayer: 'mtls', active: currentStep === 3, path: 'M 910 110 L 980 110' },
        { id: 'processor-to-kms', from: 'chat-processor', to: 'kms', protocol: 'mtls', encryptionLayer: 'kms', active: currentStep === 5, path: 'M 1080 210 L 1100 260' },
        { id: 'processor-to-db', from: 'chat-processor', to: 'postgres', protocol: 'mtls', encryptionLayer: 'mtls', active: currentStep === 6, path: 'M 1020 210 L 810 260' },
        { id: 'db-to-kafka-out', from: 'postgres', to: 'kafka-outgoing', protocol: 'mtls', encryptionLayer: 'mtls', active: currentStep === 7, path: 'M 710 460 L 710 500' },
        { id: 'kafka-out-to-conn', from: 'kafka-outgoing', to: 'connection-service-2', protocol: 'mtls', encryptionLayer: 'mtls', active: currentStep === 8, path: 'M 660 590 L 590 590' },
        { id: 'conn-to-bob', from: 'connection-service-2', to: 'bob', protocol: 'https', encryptionLayer: 'tls', active: currentStep === 9, path: 'M 340 590 L 270 590' },
    ];

    const stepDescriptions = [
        'Alice encrypts message with E2EE',
        'Sending to Connection Service via TLS',
        'Connection Service publishes to Kafka',
        'Kafka queues message',
        'Chat Processor processes message',
        'KMS generates data encryption key',
        'Writing to PostgreSQL database',
        'Database write complete',
        'Publishing to outgoing Kafka topic',
        'Connection Service delivers to Bob',
        'Bob decrypts message with E2EE',
    ];

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleStepBack = () => {
        setCurrentStep((prev) => Math.max(0, prev - 1));
        setIsPlaying(false);
    };
    const handleStepForward = () => {
        setCurrentStep((prev) => Math.min(10, prev + 1));
        setIsPlaying(false);
    };
    const handleReset = () => {
        setCurrentStep(0);
        setIsPlaying(false);
    };

    return (
        <div className="w-full space-y-4">
            {/* Title */}
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                <h2 className="text-xl font-bold text-white">
                    Real-Time Message Flow: {currentFlow.sender} → {currentFlow.recipient}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Showing actual message: "{currentFlow.originalMessage}"
                </p>
                <div className="mt-2 px-3 py-1 bg-green-500/20 border border-green-500 rounded text-sm text-green-400">
                    <span className="font-semibold">Step {currentStep + 1}/11:</span> {stepDescriptions[currentStep]}
                </div>
            </div>

            {/* Flow Visualization */}
            <div className="relative max-h-[600px] overflow-auto border border-gray-800 rounded-lg bg-gray-950">
                <FlowCanvas width={2000} height={850}>
                    {/* SVG Connections */}
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        width={2000}
                        height={850}
                        style={{ zIndex: 0 }}
                    >
                        {connections.map((connection) => (
                            <g key={connection.id}>
                                <ConnectionLine connection={connection} />
                                {connection.active && connection.path && (
                                    <DataParticle
                                        path={connection.path}
                                        encryptionLayer={connection.encryptionLayer}
                                        duration={1.5}
                                    />
                                )}
                            </g>
                        ))}
                    </svg>

                    {/* Service Blocks */}
                    <div className="relative" style={{ zIndex: 1 }}>
                        {services.map((service) => {
                            const block = (
                                <ServiceBlock
                                    key={service.id}
                                    service={service}
                                    active={service.data.state === 'active'}
                                />
                            );

                            return service.hasEnvoy ? (
                                <EnvoyWrapper
                                    key={`envoy-${service.id}`}
                                    serviceName={service.name}
                                    active={service.data.state === 'active'}
                                >
                                    {block}
                                </EnvoyWrapper>
                            ) : (
                                block
                            );
                        })}
                    </div>
                </FlowCanvas>

                {/* Encryption Layer Legend */}
                <div className="absolute bottom-4 right-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 space-y-1 text-xs">
                    <div className="font-semibold text-white mb-2">Encryption Layers</div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-300">E2EE (Client-side)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-300">TLS (Browser ↔ Server)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-gray-300">mTLS (Service Mesh)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-gray-300">KMS (Envelope)</span>
                    </div>
                </div>
            </div>

            {/* Playback Controls */}
            <FlowControls
                isPlaying={isPlaying}
                currentStep={currentStep}
                totalSteps={11}
                speed={speed}
                onPlay={handlePlay}
                onPause={handlePause}
                onStepBack={handleStepBack}
                onStepForward={handleStepForward}
                onReset={handleReset}
                onSpeedChange={setSpeed}
            />
        </div>
    );
}
