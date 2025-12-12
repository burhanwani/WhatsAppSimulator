import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ServiceBlock as ServiceBlockType, ServiceState } from '@/types/flow';

interface ServiceBlockProps {
    service: ServiceBlockType;
    active?: boolean;
    onClick?: () => void;
}

export function ServiceBlock({ service, active = false, onClick }: ServiceBlockProps) {
    const getStateStyles = (state: ServiceState) => {
        switch (state) {
            case 'active':
                return 'border-green-500 shadow-lg shadow-green-500/50';
            case 'processing':
                return 'border-blue-500 shadow-lg shadow-blue-500/50';
            case 'complete':
                return 'border-gray-500';
            case 'grayed':
                return 'opacity-40 border-gray-600';
            default:
                return 'border-gray-700';
        }
    };

    return (
        <motion.div
            className={cn(
                'relative rounded-lg border-2 bg-gray-900 p-4 cursor-pointer transition-all',
                getStateStyles(service.data.state),
                active && 'scale-105'
            )}
            animate={{
                scale: active ? 1.05 : 1,
                boxShadow: active
                    ? '0 0 20px rgba(34, 197, 94, 0.5)'
                    : '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            transition={{ duration: 0.3 }}
            onClick={onClick}
            style={{
                position: 'absolute',
                left: service.position.x,
                top: service.position.y,
                minWidth: '200px',
            }}
        >
            {/* Service Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">{service.name}</h3>
                {service.data.state === 'active' && (
                    <span className="px-2 py-1 text-xs bg-green-500 text-white rounded">
                        Active
                    </span>
                )}
            </div>

            {/* Service Sections */}
            <div className="space-y-2">
                {service.data.sections.map((section, idx) => (
                    <div key={idx} className="text-xs">
                        <div className="flex items-center gap-1 text-gray-400 mb-1">
                            <span>{section.icon}</span>
                            <span className="font-medium">{section.title}</span>
                        </div>
                        <div className="pl-4 space-y-1">
                            {section.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex justify-between">
                                    <span className="text-gray-500">{item.label}:</span>
                                    <span className={cn(
                                        item.type === 'code' && 'font-mono text-xs',
                                        item.type === 'badge' && 'px-1 py-0.5 bg-gray-800 rounded',
                                        'text-gray-300'
                                    )}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
