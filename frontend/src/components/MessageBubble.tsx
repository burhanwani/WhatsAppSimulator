import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Shield, Lock } from 'lucide-react';

interface MessageBubbleProps {
    message: string;
    isSent: boolean;
    timestamp: number;
    senderName: string;
    isEncrypted?: boolean;
}

export function MessageBubble({ message, isSent, timestamp, senderName, isEncrypted = true }: MessageBubbleProps) {
    return (
        <div className={cn('flex w-full mb-2', isSent ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[70%] rounded-lg px-4 py-2 shadow-sm',
                    isSent
                        ? 'bg-whatsapp-light-green text-gray-800'
                        : 'bg-white text-gray-800 border border-gray-200'
                )}
            >
                {!isSent && (
                    <div className="text-xs font-semibold text-whatsapp-teal mb-1">
                        {senderName}
                    </div>
                )}
                <div className="text-sm whitespace-pre-wrap break-words">
                    {message}
                </div>
                <div className="flex items-center justify-end gap-1 mt-1">
                    {isEncrypted && (
                        <Lock className="w-3 h-3 text-gray-500" />
                    )}
                    <span className="text-[10px] text-gray-500">
                        {format(timestamp, 'HH:mm')}
                    </span>
                </div>
            </div>
        </div>
    );
}
