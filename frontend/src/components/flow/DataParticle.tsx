import { motion } from 'framer-motion';
import { EncryptionLayer } from '@/types/flow';

interface DataParticleProps {
    path: string;
    encryptionLayer: EncryptionLayer;
    duration?: number;
    delay?: number;
}

const getParticleColor = (layer: EncryptionLayer) => {
    switch (layer) {
        case 'jwt': return '#F97316';  // orange-500
        case 'e2ee': return '#22C55E'; // green-500
        case 'tls': return '#3B82F6';  // blue-500
        case 'mtls': return '#A855F7'; // purple-500
        case 'kms': return '#EAB308';  // yellow-500
        default: return '#6B7280';     // gray-500
    }
};

export function DataParticle({
    path,
    encryptionLayer,
    duration = 2,
    delay = 0
}: DataParticleProps) {
    const color = getParticleColor(encryptionLayer);

    return (
        <motion.circle
            r="6"
            fill={color}
            initial={{ offsetDistance: '0%', opacity: 0 }}
            animate={{
                offsetDistance: '100%',
                opacity: [0, 1, 1, 0],
            }}
            transition={{
                duration,
                delay,
                ease: 'linear',
                repeat: Infinity,
            }}
            style={{
                offsetPath: `path('${path}')`,
                filter: `drop-shadow(0 0 4px ${color})`,
            }}
        >
            {/* Glow effect */}
            <animate
                attributeName="r"
                values="4;6;4"
                dur="1s"
                repeatCount="indefinite"
            />
        </motion.circle>
    );
}
