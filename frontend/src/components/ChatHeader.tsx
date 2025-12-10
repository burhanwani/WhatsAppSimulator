import { Avatar } from './ui/avatar';
import { Badge } from './ui/badge';
import { Shield } from 'lucide-react';

interface ChatHeaderProps {
    userName: string;
    userColor: string;
    isConnected: boolean;
}

export function ChatHeader({ userName, userColor, isConnected }: ChatHeaderProps) {
    const initial = userName.charAt(0).toUpperCase();

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-whatsapp-teal text-white border-b border-whatsapp-teal/20">
            <div className="flex items-center gap-3">
                <Avatar
                    fallback={initial}
                    className="border-2 border-white"
                    style={{ backgroundColor: userColor }}
                />
                <div>
                    <h2 className="font-semibold text-lg">{userName}</h2>
                    <div className="flex items-center gap-1 text-xs">
                        <Shield className="w-3 h-3" />
                        <span>End-to-end encrypted</span>
                    </div>
                </div>
            </div>
            <Badge variant={isConnected ? 'success' : 'destructive'} className="text-xs">
                {isConnected ? '● Connected' : '○ Disconnected'}
            </Badge>
        </div>
    );
}
