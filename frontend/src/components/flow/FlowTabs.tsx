import { useState } from 'react';
import { PhaseZeroFlow } from './PhaseZeroFlow';
import { RealTimeMessageFlow } from './RealTimeMessageFlow';

export function FlowTabs() {
    const [activePhase, setActivePhase] = useState<0 | 1>(0);

    return (
        <div className="h-full flex flex-col">
            {/* Tab Buttons */}
            <div className="flex border-b border-gray-800 mb-4">
                <button
                    onClick={() => setActivePhase(0)}
                    className={`px-6 py-3 font-medium transition-colors relative ${activePhase === 0
                        ? 'text-white bg-gray-800'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <span>Phase 0: Infrastructure Setup</span>
                        {activePhase === 0 && (
                            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">
                                Active
                            </span>
                        )}
                    </span>
                    {activePhase === 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
                    )}
                </button>

                <button
                    onClick={() => setActivePhase(1)}
                    className={`px-6 py-3 font-medium transition-colors relative ${activePhase === 1
                        ? 'text-white bg-gray-800'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <span>Phase 1: Message Flow</span>
                        {activePhase === 1 && (
                            <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">
                                Active
                            </span>
                        )}
                    </span>
                    {activePhase === 1 && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                    )}
                </button>
            </div>

            {/* Phase Content */}
            {activePhase === 0 ? <PhaseZeroFlow /> : <RealTimeMessageFlow />}
        </div>
    );
}
