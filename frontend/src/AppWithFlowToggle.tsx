import { useState } from 'react';
import { CompleteMessageFlow } from './components/flow';
import { Button } from './components/ui/button';
import ChatApp from './ChatApp'; // We'll create this by extracting chat logic

export default function App() {
    const [view, setView] = useState<'chat' | 'flow'>('chat');

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Navigation */}
            <div className="bg-white border-b border-gray-200 px-6 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-800">
                        WhatsApp Simulator
                    </h1>
                    <div className="flex gap-2">
                        <Button
                            variant={view === 'chat' ? 'default' : 'outline'}
                            onClick={() => setView('chat')}
                        >
                            💬 Chat Interface
                        </Button>
                        <Button
                            variant={view === 'flow' ? 'default' : 'outline'}
                            onClick={() => setView('flow')}
                        >
                            🔄 Flow Visualization
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {view === 'chat' ? (
                    <ChatApp />
                ) : (
                    <div className="max-w-7xl mx-auto">
                        <CompleteMessageFlow />
                    </div>
                )}
            </div>
        </div>
    );
}
