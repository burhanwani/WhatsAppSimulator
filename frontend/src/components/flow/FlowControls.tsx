import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FlowControlsProps {
    isPlaying: boolean;
    currentStep: number;
    totalSteps: number;
    speed: number;
    onPlay: () => void;
    onPause: () => void;
    onStepBack: () => void;
    onStepForward: () => void;
    onReset: () => void;
    onSpeedChange: (speed: number) => void;
}

export function FlowControls({
    isPlaying,
    currentStep,
    totalSteps,
    speed,
    onPlay,
    onPause,
    onStepBack,
    onStepForward,
    onReset,
    onSpeedChange,
}: FlowControlsProps) {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-900 border-t border-gray-800">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onReset}
                    className="h-8"
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onStepBack}
                    disabled={currentStep === 0}
                    className="h-8"
                >
                    <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                    variant="default"
                    size="sm"
                    onClick={isPlaying ? onPause : onPlay}
                    className="h-8 px-4"
                >
                    {isPlaying ? (
                        <Pause className="h-4 w-4" />
                    ) : (
                        <Play className="h-4 w-4" />
                    )}
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onStepForward}
                    disabled={currentStep >= totalSteps - 1}
                    className="h-8"
                >
                    <SkipForward className="h-4 w-4" />
                </Button>
            </div>

            {/* Progress Display */}
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                    Step {currentStep + 1} of {totalSteps}
                </span>

                {/* Progress Bar */}
                <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                    />
                </div>
            </div>

            {/* Speed Control */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Speed:</span>
                <div className="flex gap-1">
                    {[0.5, 1, 2].map((s) => (
                        <Button
                            key={s}
                            variant={speed === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onSpeedChange(s)}
                            className="h-8 px-3"
                        >
                            {s}x
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
