import { ReactNode } from 'react';

interface FlowCanvasProps {
    children: ReactNode;
    width?: number;
    height?: number;
}

export function FlowCanvas({ children, width = 1400, height = 800 }: FlowCanvasProps) {
    return (
        <div className="relative w-full bg-gray-950">
            {/* SVG Layer for connections */}
            <svg
                className="absolute inset-0 pointer-events-none"
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={{ zIndex: 0 }}
            >
                <defs>
                    {/* Gradient for glow effects */}
                    <linearGradient id="glow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Connections will be rendered here */}
            </svg>

            {/* Service Blocks Layer */}
            <div
                className="relative"
                style={{
                    width,
                    height,
                    zIndex: 1
                }}
            >
                {children}
            </div>
        </div>
    );
}
