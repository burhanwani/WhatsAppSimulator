import { useState, useEffect } from 'react';
import { FlowCanvas } from './FlowCanvas';
import { ServiceBlock } from './ServiceBlock';
import { EnvoyWrapper } from './EnvoyWrapper';
import { ConnectionLine } from './ConnectionLine';
import { DataParticle } from './DataParticle';
import { FlowControls } from './FlowControls';
import {
    messageFlowServices,
    infrastructureServices,
    messageFlowConnections,
    messageFlowSteps
} from '@/data/flowData';
import { Connection } from '@/types/flow';

export function CompleteMessageFlow() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);

    const totalSteps = messageFlowSteps.length;

    // Auto-play logic
    useEffect(() => {
        if (!isPlaying) return;

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
    }, [isPlaying, speed, totalSteps]);

    // Determine active services and connections based on current step
    const currentStepData = messageFlowSteps[currentStep];
    const activeServiceId = currentStepData?.service;
    const activeConnectionId = currentStepData?.connection;

    // Update service states
    const servicesWithStates = messageFlowServices.map((service) => ({
        ...service,
        data: {
            ...service.data,
            state: service.id === activeServiceId ? 'active' as const :
                currentStep > messageFlowSteps.findIndex(s => s.service === service.id) ? 'complete' as const :
                    'idle' as const,
        },
    }));

    // Update connection states
    const connectionsWithStates: Connection[] = messageFlowConnections.map((conn) => ({
        ...conn,
        active: conn.id === activeConnectionId,
    }));

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleStepBack = () => {
        setCurrentStep((prev) => Math.max(0, prev - 1));
        setIsPlaying(false);
    };

    const handleStepForward = () => {
        setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
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
                    Phase 1: Message Flow - Alice to Bob
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Watch how a message travels through all {messageFlowServices.length} services with multiple encryption layers
                </p>
                {currentStepData && (
                    <div className="mt-2 px-3 py-1 bg-green-500/20 border border-green-500 rounded text-sm text-green-400">
                        <span className="font-semibold">Current:</span> {currentStepData.action}
                    </div>
                )}
            </div>

            {/* Flow Visualization */}
            <div className="relative">
                <FlowCanvas width={1350} height={500}>
                    {/* SVG Connections */}
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        width={1350}
                        height={500}
                        style={{ zIndex: 0 }}
                    >
                        {/* Draw connection lines */}
                        {connectionsWithStates.map((connection) => (
                            <g key={connection.id}>
                                <ConnectionLine connection={connection} />
                                {/* Animated particle on active connection */}
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
                        {servicesWithStates.map((service) => {
                            const isActive = service.id === activeServiceId;

                            const block = (
                                <ServiceBlock
                                    key={service.id}
                                    service={service}
                                    active={isActive}
                                />
                            );

                            return service.hasEnvoy ? (
                                <EnvoyWrapper
                                    key={`envoy-${service.id}`}
                                    serviceName={service.name}
                                    active={isActive}
                                >
                                    {block}
                                </EnvoyWrapper>
                            ) : (
                                block
                            );
                        })}

                        {/* Infrastructure Services (Sidebar) */}
                        {infrastructureServices.map((service) => (
                            <ServiceBlock
                                key={service.id}
                                service={service}
                                active={false}
                            />
                        ))}
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
