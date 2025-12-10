import { useState, KeyboardEvent } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Send } from 'lucide-react';

interface MessageInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSend(message.trim());
            setMessage('');
        }
    };

    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex items-center gap-2 p-3 bg-gray-50 border-t border-gray-200">
            <Input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={disabled}
                className="flex-1 bg-white"
            />
            <Button
                onClick={handleSend}
                disabled={disabled || !message.trim()}
                size="icon"
                className="bg-whatsapp-green hover:bg-whatsapp-teal"
            >
                <Send className="w-4 h-4" />
            </Button>
        </div>
    );
}
