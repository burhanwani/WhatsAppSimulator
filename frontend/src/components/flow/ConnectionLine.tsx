import { motion } from 'framer-motion';
import { Connection, EncryptionLayer } from '@/types/flow';

interface ConnectionLineProps {
    connection: Connection;
}

const getConnectionColor = (layer: EncryptionLayer, active: boolean) => {
    if (!active) return '#4B5563'; // gray-600

    switch (layer) {
        case 'jwt': return '#F97316';  // orange-500
        case 'e2ee': return '#22C55E'; // green-500
        case 'tls': return '#3B82F6';  // blue-500
        case 'mtls': return '#A855F7'; // purple-500
        case 'kms': return '#EAB308';  // yellow-500
        default: return '#6B7280';     // gray-500
    }
};

export function ConnectionLine({ connection }: ConnectionLineProps) {
    const color = getConnectionColor(connection.encryptionLayer, connection.active);
    const strokeWidth = connection.active ? 3 : 2;

    if (!connection.path) return null;

    return (
        <g>
            {/* Connection Path */}
            <motion.path
                d={connection.path}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                    pathLength: 1,
                    opacity: connection.active ? 1 : 0.3
                }}
                transition={{ duration: 0.5 }}
            />

            {/* Glow Effect when active */}
            {connection.active && (
                <motion.path
                    d={connection.path}
                    stroke={color}
                    strokeWidth={strokeWidth + 4}
                    fill="none"
                    opacity={0.3}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5 }}
                />
            )}

            {/* Protocol Label */}
            {connection.active && connection.protocol && (
                <text
                    x="50%"
                    y="50%"
                    fill={color}
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="middle"
                >
                    {connection.protocol.toUpperCase()}
                </text>
            )}
        </g>
    );
}
