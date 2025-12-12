import { useState, useEffect } from 'react';
import { FlowCanvas } from './FlowCanvas';
import { ServiceBlock } from './ServiceBlock';
import { EnvoyWrapper } from './EnvoyWrapper';
import { FlowControls } from './FlowControls';
import { ServiceBlock as ServiceBlockType } from '@/types/flow';

// Mock data for demonstration
const mockServices: ServiceBlockType[] = [
    {
        id: 'alice',
        name: "Alice's Browser",
        type: 'browser',
        position: { x: 50, y: 100 },
        phase: 'message',
        hasEnvoy: false,
        connections: [],
        data: {
            title: "Alice's Browser",
            state: 'active',
            sections: [
                {
                    icon: '🔑',
                    title: 'E2EE Encryption',
                    items: [
                        { label: 'Message', value: 'Hello Bob!', type: 'text' },
                        { label: 'Encrypted', value: 'U2FsdGVk...', type: 'code' },
                    ],
                },
            ],
        },
    },
    {
        id: 'connection-service',
        name: 'Connection Service',
        type: 'connection-service',
        position: { x: 350, y: 100 },
        phase: 'message',
        hasEnvoy: true,
        connections: [],
        data: {
            title: 'Connection Service',
            state: 'processing',
            sections: [
                {
                    icon: '📨',
                    title: 'WebSocket',
                    items: [
                        { label: 'Connection', value: 'ws-abc123', type: 'text' },
                        { label: 'Status', value: 'Active', type: 'badge' },
                    ],
                },
                {
                    icon: '🔐',
                    title: 'mTLS',
                    items: [
                        { label: 'Verified', value: '✓', type: 'status' },
                    ],
                },
            ],
        },
    },
    {
        id: 'kafka',
        name: 'Kafka (Incoming)',
        type: 'kafka',
        position: { x: 650, y: 100 },
        phase: 'message',
        hasEnvoy: true,
        connections: [],
        data: {
            title: 'Kafka',
            state: 'idle',
            sections: [
                {
                    icon: '📮',
                    title: 'Message Broker',
                    items: [
                        { label: 'Topic', value: 'incoming-messages', type: 'text' },
                        { label: 'Offset', value: '#12345', type: 'code' },
                    ],
                },
            ],
        },
    },
];

export function MessageFlowDemo() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [activeServices, setActiveServices] = useState<Set<string>>(new Set());

    const totalSteps = mockServices.length;

    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setCurrentStep((prev) => {
                const next = (prev + 1) % totalSteps;
                setActiveServices(new Set([mockServices[next].id]));
                return next;
            });
        }, 2000 / speed);

        return () => clearInterval(interval);
    }, [isPlaying, speed, totalSteps]);

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleStepBack = () => {
        setCurrentStep((prev) => Math.max(0, prev - 1));
        setActiveServices(new Set([mockServices[Math.max(0, currentStep - 1)].id]));
    };

    const handleStepForward = () => {
        setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
        setActiveServices(new Set([mockServices[Math.min(totalSteps - 1, currentStep + 1)].id]));
    };

    const handleReset = () => {
        setCurrentStep(0);
        setIsPlaying(false);
        setActiveServices(new Set());
    };

    return (
        <div className="w-full space-y-4">
            {/* Title */}
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                <h2 className="text-xl font-bold text-white">
                    Phase 1: Message Flow - Alice to Bob
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Watch how a message travels through the system with end-to-end encryption
                </p>
            </div>

            {/* Flow Visualization */}
            <FlowCanvas width={1000} height={400}>
                {mockServices.map((service) => {
                    const isActive = activeServices.has(service.id);

                    const blockWithState = {
                        ...service,
                        data: {
                            ...service.data,
                            state: isActive ? 'active' as const : service.data.state,
                        },
                    };

                    const block = (
                        <ServiceBlock
                            key={service.id}
                            service={blockWithState}
                            active={isActive}
                        />
                    );

                    return service.hasEnvoy ? (
                        <EnvoyWrapper
                            key={service.id}
                            serviceName={service.name}
                            active={isActive}
                        >
                            {block}
                        </EnvoyWrapper>
                    ) : (
                        block
                    );
                })}
            </FlowCanvas>

            {/* Playback Controls */}
            <FlowControls
                isPlaying={isPlaying}
                currentStep={currentStep}
                totalSteps={totalSteps}
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
