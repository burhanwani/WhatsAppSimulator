import { useState, useEffect } from 'react';
import { ServiceBlock } from './ServiceBlock';
import { ConnectionLine } from './ConnectionLine';
import { FlowCanvas } from './FlowCanvas';
import { FlowControls } from './FlowControls';
import { ServiceBlock as ServiceBlockType, Connection } from '@/types/flow';

export function PhaseZeroFlow() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);

    // Auto-play through steps
    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setCurrentStep((prev) => {
                if (prev >= 5) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 2000 / speed);

        return () => clearInterval(interval);
    }, [isPlaying, speed]);

    // Infrastructure service blocks
    const serviceBlocks: ServiceBlockType[] = [
        {
            id: 'keycloak',
            name: 'Keycloak',
            type: 'auth',
            position: { x: 100, y: 100 },
            phase: 'infrastructure',
            hasEnvoy: false,
            connections: ['services'],
            data: {
                title: 'Keycloak',
                state: currentStep === 1 ? 'active' : currentStep > 1 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '🔐',
                        title: 'Authentication',
                        items: [
                            { label: 'Realm', value: 'my-cloud', type: 'text' },
                            { label: 'Protocol', value: 'OIDC', type: 'badge' },
                            { label: 'Client ID', value: 'my-microservice', type: 'code' },
                            { label: 'Token', value: 'JWT (2048-bit)', type: 'text' },
                            { label: 'Status', value: currentStep >= 1 ? 'Authenticated ✓' : 'Pending...', type: 'status' },
                        ],
                    },
                ],
            },
        },
        {
            id: 'redis-infra',
            name: 'Redis Session Store',
            type: 'cache',
            position: { x: 500, y: 100 },
            phase: 'infrastructure',
            hasEnvoy: false,
            connections: [],
            data: {
                title: 'Redis',
                state: currentStep === 2 ? 'active' : currentStep > 2 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '⚡',
                        title: 'Session Store',
                        items: [
                            { label: 'Type', value: 'In-Memory', type: 'text' },
                            { label: 'Port', value: '6379', type: 'code' },
                            { label: 'Pool', value: '100 connections', type: 'text' },
                            { label: 'Memory', value: '256 MB', type: 'text' },
                            { label: 'Status', value: currentStep >= 2 ? 'Ready ✓' : 'Initializing...', type: 'status' },
                        ],
                    },
                ],
            },
        },
        {
            id: 'istio',
            name: 'Istio Control Plane',
            type: 'mesh',
            position: { x: 900, y: 100 },
            phase: 'infrastructure',
            hasEnvoy: false,
            connections: ['envoy'],
            data: {
                title: 'Istio',
                state: currentStep === 3 ? 'active' : currentStep > 3 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '🕸️',
                        title: 'Service Mesh',
                        items: [
                            { label: 'Component', value: 'Pilot', type: 'badge' },
                            { label: 'CA', value: 'Citadel', type: 'text' },
                            { label: 'Policy', value: 'STRICT mTLS', type: 'badge' },
                            { label: 'Certs', value: 'Auto-rotate 90d', type: 'text' },
                            { label: 'Status', value: currentStep >= 3 ? 'Active ✓' : 'Starting...', type: 'status' },
                        ],
                    },
                ],
            },
        },
        {
            id: 'envoy',
            name: 'Envoy Proxies',
            type: 'proxy',
            position: { x: 500, y: 400 },
            phase: 'infrastructure',
            hasEnvoy: false,
            connections: [],
            data: {
                title: 'Envoy Sidecars',
                state: currentStep === 4 || currentStep === 5 ? 'active' : currentStep > 5 ? 'complete' : 'idle',
                sections: [
                    {
                        icon: '🔀',
                        title: 'Sidecar Injection',
                        items: [
                            { label: 'Mode', value: 'Automatic', type: 'badge' },
                            { label: 'Services', value: '5 proxies', type: 'text' },
                            { label: 'Protocol', value: 'HTTP/2, gRPC', type: 'text' },
                            { label: 'mTLS', value: currentStep >= 5 ? 'Established ✓' : 'Handshaking...', type: 'status' },
                        ],
                    },
                ],
            },
        },
    ];

    // Connection paths
    const connections: Connection[] = [
        { id: 'keycloak-to-services', from: 'keycloak', to: 'redis-infra', protocol: 'https', encryptionLayer: 'tls', active: currentStep >= 1, path: 'M 300 190 L 500 190' },
        { id: 'redis-to-istio', from: 'redis-infra', to: 'istio', protocol: 'https', encryptionLayer: 'tls', active: currentStep >= 2, path: 'M 700 190 L 900 190' },
        { id: 'istio-to-envoy', from: 'istio', to: 'envoy', protocol: 'mtls', encryptionLayer: 'mtls', active: currentStep >= 3, path: 'M 1000 290 L 700 400' },
    ];

    const stepDescriptions = [
        'Phase 0: Infrastructure Setup - Security layers before message processing',
        'Step 1: Keycloak authenticates microservices using OIDC client credentials',
        'Step 2: Redis session store initialized for caching user sessions and keys',
        'Step 3: Istio control plane distributes mTLS certificates to all services',
        'Step 4: Envoy sidecars automatically injected into all service pods',
        'Step 5: Mutual TLS connections established between all services - Infrastructure ready!',
    ];

    const handlePlayPause = () => setIsPlaying(!isPlaying);
    const handleReset = () => { setCurrentStep(0); setIsPlaying(false); };
    const handleStepForward = () => setCurrentStep(Math.min(currentStep + 1, 5));
    const handleStepBackward = () => setCurrentStep(Math.max(currentStep - 1, 0));
    const handleSpeedChange = (newSpeed: number) => setSpeed(newSpeed);

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold">Phase 0: Infrastructure Setup</h2>
                    <p className="text-sm text-gray-400 mt-1">Security and caching layers initialization</p>
                </div>
                <div className="text-sm text-gray-400">
                    Step {currentStep} of 5
                </div>
            </div>

            {/* Step Description */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex-shrink-0">
                <p className="text-sm">{stepDescriptions[currentStep]}</p>
            </div>

            {/* Flow Visualization - scrollable */}
            <div className="flex-1 min-h-0 relative max-h-[600px] overflow-auto border border-gray-800 rounded-lg bg-gray-950">
                <FlowCanvas width={1400} height={600}>
                    {/* SVG Connections */}
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        width={1400}
                        height={600}
                        style={{ zIndex: 0 }}
                    >
                        {connections.map((connection) => (
                            <g key={connection.id}>
                                <ConnectionLine connection={connection} />
                            </g>
                        ))}
                    </svg>

                    {serviceBlocks.map((service) => (
                        <ServiceBlock key={service.id} service={service} />
                    ))}
                </FlowCanvas>
            </div>

            {/* Controls - always visible at bottom */}
            <div className="flex-shrink-0">
                <FlowControls
                    currentStep={currentStep}
                    totalSteps={5}
                    isPlaying={isPlaying}
                    speed={speed}
                    onPlay={handlePlayPause}
                    onPause={handlePlayPause}
                    onReset={handleReset}
                    onStepForward={handleStepForward}
                    onStepBack={handleStepBackward}
                    onSpeedChange={handleSpeedChange}
                />
            </div>

            {/* Call to Action */}
            {currentStep === 5 && (
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 text-center flex-shrink-0">
                    <p className="text-green-400 font-medium">
                        ✅ Infrastructure Ready! Switch to Phase 1 to see message flow →
                    </p>
                </div>
            )}
        </div>
    );
}
