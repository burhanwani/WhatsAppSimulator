import { useState, useEffect } from 'react';
import { FlowCanvas } from './FlowCanvas';
import { ServiceBlock } from './ServiceBlock';
import { EnvoyWrapper } from './EnvoyWrapper';
import { ConnectionLine } from './ConnectionLine';
import { DataParticle } from './DataParticle';
import { MessageFlowData } from '@/services/messageFlowTracker';
import { Connection, ServiceBlock as ServiceBlockType } from '@/types/flow';

interface JWTFlowVisualizationProps {
    loginFlows: MessageFlowData[];
    apiFlows: MessageFlowData[];
}

export function JWTFlowVisualization({ loginFlows, apiFlows }: JWTFlowVisualizationProps) {
    // State for JWT stage visualization - moved to top level of this component
    const [jwtStage, setJwtStage] = useState<1 | 2>(1);
    const [jwtStep, setJwtStep] = useState(0);
    const [jwtPlaying, setJwtPlaying] = useState(true);

    // Auto-play through steps
    useEffect(() => {
        if (!jwtPlaying) return;

        const maxSteps = jwtStage === 1 ? 4 : 4;
        const interval = setInterval(() => {
            setJwtStep((prev) => {
                if (prev >= maxSteps - 1) {
                    // Move to stage 2 if in stage 1
                    if (jwtStage === 1 && apiFlows.length > 0) {
                        setJwtStage(2);
                        return 0;
                    }
                    setJwtPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 1500);

        return () => clearInterval(interval);
    }, [jwtPlaying, jwtStage, apiFlows.length]);

    // Stage 1: JWT Issuance from Keycloak
    const stage1Descriptions = [
        'Alice authenticates with Keycloak',
        'Keycloak validates credentials & issues JWT to Alice',
        'Bob authenticates with Keycloak',
        'Keycloak validates credentials & issues JWT to Bob',
    ];

    // Stage 2: JWT usage in API calls
    const stage2Descriptions = [
        'Alice sends JWT in Authorization header to Key Service',
        'Key Service validates JWT and uploads public key',
        'Bob sends JWT in Authorization header to Key Service',
        'Alice connects to WebSocket with JWT authentication',
    ];

    // Service blocks for Stage 1: JWT Issuance
    const stage1Services: ServiceBlockType[] = [
        {
            id: 'keycloak',
            name: 'Keycloak',
            type: 'keycloak',
            position: { x: 380, y: 120 },
            phase: 'setup',
            hasEnvoy: false,
            connections: [],
            data: {
                title: 'Keycloak Auth Server',
                state: (jwtStep === 1 || jwtStep === 3) ? 'active' : 'complete',
                sections: [{
                    icon: '🔐',
                    title: 'OpenID Connect',
                    items: [
                        { label: 'Realm', value: 'my-cloud', type: 'badge' as const },
                        { label: 'Grant Type', value: 'password', type: 'text' as const },
                        { label: 'Client', value: 'whatsapp-frontend', type: 'code' as const },
                        { label: 'Tokens Issued', value: loginFlows.length.toString(), type: 'badge' as const },
                    ]
                }]
            }
        },
        {
            id: 'alice-browser',
            name: "Alice's Browser",
            type: 'browser',
            position: { x: 50, y: 50 },
            phase: 'setup',
            hasEnvoy: false,
            connections: [],
            data: {
                title: "Alice's Browser",
                state: jwtStep === 0 ? 'active' : jwtStep >= 1 ? 'complete' : 'idle',
                sections: [{
                    icon: jwtStep >= 1 ? '✅' : '🔄',
                    title: jwtStep >= 1 ? 'Authenticated' : 'Authenticating...',
                    items: [
                        { label: 'Username', value: 'alice', type: 'text' as const },
                        { label: 'JWT', value: jwtStep >= 1 ? loginFlows.find((f) => f.sender === 'alice')?.authData?.token || '✓' : '...', type: 'code' as const },
                        { label: 'Expires', value: jwtStep >= 1 ? '300s' : '...', type: 'badge' as const },
                    ]
                }]
            }
        },
        {
            id: 'bob-browser',
            name: "Bob's Browser",
            type: 'browser',
            position: { x: 50, y: 250 },
            phase: 'setup',
            hasEnvoy: false,
            connections: [],
            data: {
                title: "Bob's Browser",
                state: jwtStep === 2 ? 'active' : jwtStep >= 3 ? 'complete' : 'idle',
                sections: [{
                    icon: jwtStep >= 3 ? '✅' : jwtStep >= 2 ? '🔄' : '⏳',
                    title: jwtStep >= 3 ? 'Authenticated' : jwtStep >= 2 ? 'Authenticating...' : 'Waiting',
                    items: [
                        { label: 'Username', value: 'bob', type: 'text' as const },
                        { label: 'JWT', value: jwtStep >= 3 ? loginFlows.find((f) => f.sender === 'bob')?.authData?.token || '✓' : '...', type: 'code' as const },
                        { label: 'Expires', value: jwtStep >= 3 ? '300s' : '...', type: 'badge' as const },
                    ]
                }]
            }
        }
    ];

    // Connections for Stage 1
    const stage1Connections: Connection[] = [
        {
            id: 'alice-to-keycloak',
            from: 'alice-browser',
            to: 'keycloak',
            protocol: 'https',
            encryptionLayer: 'tls',
            active: jwtStep === 0,
            path: 'M 250 100 Q 300 80 380 140',
        },
        {
            id: 'keycloak-to-alice',
            from: 'keycloak',
            to: 'alice-browser',
            protocol: 'https',
            encryptionLayer: 'jwt',
            active: jwtStep === 1,
            path: 'M 380 140 Q 300 120 250 100',
        },
        {
            id: 'bob-to-keycloak',
            from: 'bob-browser',
            to: 'keycloak',
            protocol: 'https',
            encryptionLayer: 'tls',
            active: jwtStep === 2,
            path: 'M 250 300 Q 300 240 380 180',
        },
        {
            id: 'keycloak-to-bob',
            from: 'keycloak',
            to: 'bob-browser',
            protocol: 'https',
            encryptionLayer: 'jwt',
            active: jwtStep === 3,
            path: 'M 380 180 Q 300 260 250 300',
        }
    ];

    // Service blocks for Stage 2: JWT Usage
    const stage2Services: ServiceBlockType[] = [
        {
            id: 'alice-browser-2',
            name: "Alice's Browser",
            type: 'browser',
            position: { x: 50, y: 50 },
            phase: 'setup',
            hasEnvoy: false,
            connections: [],
            data: {
                title: "Alice's Browser",
                state: (jwtStep === 0 || jwtStep === 3) ? 'active' : 'complete',
                sections: [{
                    icon: '🔑',
                    title: 'JWT Bearer Token',
                    items: [
                        { label: 'Header', value: 'Authorization: Bearer ...', type: 'code' as const },
                        { label: 'Status', value: 'Authenticated', type: 'badge' as const },
                    ]
                }]
            }
        },
        {
            id: 'bob-browser-2',
            name: "Bob's Browser",
            type: 'browser',
            position: { x: 50, y: 280 },
            phase: 'setup',
            hasEnvoy: false,
            connections: [],
            data: {
                title: "Bob's Browser",
                state: jwtStep === 2 ? 'active' : jwtStep > 2 ? 'complete' : 'idle',
                sections: [{
                    icon: '🔑',
                    title: 'JWT Bearer Token',
                    items: [
                        { label: 'Header', value: 'Authorization: Bearer ...', type: 'code' as const },
                        { label: 'Status', value: 'Authenticated', type: 'badge' as const },
                    ]
                }]
            }
        },
        {
            id: 'key-service',
            name: 'Key Service',
            type: 'connection-service',
            position: { x: 380, y: 50 },
            phase: 'setup',
            hasEnvoy: true,
            connections: [],
            data: {
                title: 'Key Service (Port 5000)',
                state: (jwtStep === 1 || jwtStep === 2) ? 'active' : jwtStep > 2 ? 'complete' : 'idle',
                sections: [{
                    icon: '🔐',
                    title: 'JWT Validation',
                    items: [
                        { label: 'Validates', value: 'Bearer token', type: 'text' as const },
                        { label: 'Issuer', value: 'Keycloak', type: 'badge' as const },
                        { label: 'Endpoints', value: '/keys', type: 'code' as const },
                    ]
                }, {
                    icon: '📝',
                    title: 'Operations',
                    items: [
                        { label: 'POST /keys', value: 'Upload public key', type: 'text' as const },
                        { label: 'GET /keys/:id', value: 'Fetch public key', type: 'text' as const },
                    ]
                }]
            }
        },
        {
            id: 'connection-service',
            name: 'Connection Service',
            type: 'connection-service',
            position: { x: 380, y: 280 },
            phase: 'setup',
            hasEnvoy: true,
            connections: [],
            data: {
                title: 'Connection Service (Port 8000)',
                state: jwtStep === 3 ? 'active' : 'idle',
                sections: [{
                    icon: '🔐',
                    title: 'WebSocket Auth',
                    items: [
                        { label: 'Protocol', value: 'ws:// with JWT', type: 'text' as const },
                        { label: 'Token in', value: 'URL query param', type: 'badge' as const },
                    ]
                }]
            }
        }
    ];

    // Connections for Stage 2
    const stage2Connections: Connection[] = [
        {
            id: 'alice-to-keyservice',
            from: 'alice-browser-2',
            to: 'key-service',
            protocol: 'https',
            encryptionLayer: 'jwt',
            active: jwtStep === 0,
            path: 'M 250 100 L 380 100',
        },
        {
            id: 'keyservice-to-alice',
            from: 'key-service',
            to: 'alice-browser-2',
            protocol: 'https',
            encryptionLayer: 'tls',
            active: jwtStep === 1,
            path: 'M 380 100 L 250 100',
        },
        {
            id: 'bob-to-keyservice',
            from: 'bob-browser-2',
            to: 'key-service',
            protocol: 'https',
            encryptionLayer: 'jwt',
            active: jwtStep === 2,
            path: 'M 250 330 Q 300 200 380 150',
        },
        {
            id: 'alice-to-ws',
            from: 'alice-browser-2',
            to: 'connection-service',
            protocol: 'websocket',
            encryptionLayer: 'jwt',
            active: jwtStep === 3,
            path: 'M 250 100 Q 300 220 380 330',
        }
    ];

    const currentStageDescriptions = jwtStage === 1 ? stage1Descriptions : stage2Descriptions;
    const currentServices = jwtStage === 1 ? stage1Services : stage2Services;
    const currentConnections = jwtStage === 1 ? stage1Connections : stage2Connections;

    return (
        <div className="w-full space-y-4">
            {/* Stage Header */}
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {jwtStage === 1
                                ? '🔐 Stage 1: JWT Token Issuance'
                                : '🔑 Stage 2: JWT Token Usage in API Calls'}
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            {jwtStage === 1
                                ? 'Keycloak authenticates users and issues JWT tokens'
                                : 'JWT tokens are passed in Authorization headers for all API calls'}
                        </p>
                    </div>
                    {/* Stage Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setJwtStage(1); setJwtStep(0); }}
                            className={`px-3 py-1.5 text-sm rounded ${jwtStage === 1 ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                            Stage 1: Issuance
                        </button>
                        <button
                            onClick={() => { setJwtStage(2); setJwtStep(0); }}
                            className={`px-3 py-1.5 text-sm rounded ${jwtStage === 2 ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            disabled={apiFlows.length === 0}
                        >
                            Stage 2: Usage
                        </button>
                    </div>
                </div>
                {/* Step Description */}
                <div className="mt-3 px-3 py-2 bg-orange-500/20 border border-orange-500 rounded text-sm text-orange-300">
                    <span className="font-semibold">Step {jwtStep + 1}/{currentStageDescriptions.length}:</span> {currentStageDescriptions[jwtStep]}
                </div>
            </div>

            {/* JWT Flow Visualization */}
            <div className="relative">
                <FlowCanvas width={800} height={400}>
                    {/* SVG Connections */}
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        width={800}
                        height={400}
                        style={{ zIndex: 0 }}
                    >
                        {currentConnections.map((connection) => (
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
                        {currentServices.map((service) => (
                            service.hasEnvoy ? (
                                <EnvoyWrapper
                                    key={`envoy-${service.id}`}
                                    serviceName={service.name}
                                    active={service.data.state === 'active'}
                                >
                                    <ServiceBlock service={service} active={service.data.state === 'active'} />
                                </EnvoyWrapper>
                            ) : (
                                <ServiceBlock key={service.id} service={service} active={service.data.state === 'active'} />
                            )
                        ))}
                    </div>
                </FlowCanvas>

                {/* Encryption Layer Legend */}
                <div className="absolute bottom-4 right-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 space-y-1 text-xs">
                    <div className="font-semibold text-white mb-2">Token Flow</div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-gray-300">JWT Token</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-300">TLS Encrypted</span>
                    </div>
                </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4 p-3 bg-gray-900 border border-gray-800 rounded-lg">
                <button
                    onClick={() => setJwtStep(Math.max(0, jwtStep - 1))}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                >
                    ⏮ Prev
                </button>
                <button
                    onClick={() => setJwtPlaying(!jwtPlaying)}
                    className={`px-4 py-1.5 rounded text-sm ${jwtPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} text-white`}
                >
                    {jwtPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button
                    onClick={() => setJwtStep(Math.min(currentStageDescriptions.length - 1, jwtStep + 1))}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                >
                    Next ⏭
                </button>
                <button
                    onClick={() => { setJwtStep(0); setJwtStage(1); }}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                >
                    🔄 Reset
                </button>
            </div>

            {/* JWT Token Details */}
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">🔐 JWT Token Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    {loginFlows.map((flow, index) => (
                        <div key={index} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">👤</span>
                                <span className="font-semibold text-white">{flow.sender}</span>
                            </div>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Token:</span>
                                    <code className="text-orange-400">{flow.authData?.token || 'eyJ...'}</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Expires:</span>
                                    <span className="text-green-400">300 seconds</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Issued:</span>
                                    <span className="text-gray-300">{new Date(flow.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Next Step Prompt */}
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg text-center">
                <p className="text-sm text-gray-400">
                    💬 Send a message from Alice in the <strong>Chat Interface</strong> to see the full message flow with E2EE encryption!
                </p>
            </div>
        </div>
    );
}
