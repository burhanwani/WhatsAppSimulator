import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EnvoyWrapperProps {
    children: React.ReactNode;
    active?: boolean;
    serviceName: string;
}

export function EnvoyWrapper({ children, active = false, serviceName }: EnvoyWrapperProps) {
    return (
        <div className="relative">
            {/* Envoy Sidecar Frame */}
            <motion.div
                className={cn(
                    'absolute inset-0 rounded-lg border-2 border-purple-500 pointer-events-none',
                    active && 'shadow-lg shadow-purple-500/50'
                )}
                animate={{
                    opacity: active ? 1 : 0.6,
                    scale: active ? 1.02 : 1,
                }}
                transition={{ duration: 0.3 }}
                style={{
                    margin: '-8px',
                    padding: '8px',
                }}
            />

            {/* Envoy Label */}
            <div className="absolute -top-3 left-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded z-10">
                Envoy: {serviceName}
            </div>

            {/* Service Content */}
            <div className="relative z-0">
                {children}
            </div>

            {/* mTLS Indicator */}
            {active && (
                <motion.div
                    className="absolute -bottom-2 -right-2 px-2 py-1 bg-purple-600 text-white text-xs rounded flex items-center gap-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <span>🔒</span>
                    <span>mTLS</span>
                </motion.div>
            )}
        </div>
    );
}
