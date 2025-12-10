import { useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    timestamp: number;
}

interface ChatWindowProps {
    userId: string;
    userName: string;
    userColor: string;
    otherUserId: string;
    otherUserName: string;
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isConnected: boolean;
}

export function ChatWindow({
    userId,
    userName,
    userColor,
    otherUserId,
    otherUserName,
    messages,
    onSendMessage,
    isConnected,
}: ChatWindowProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <Card className="flex flex-col h-screen shadow-lg overflow-hidden">
            <ChatHeader
                userName={userName}
                userColor={userColor}
                isConnected={isConnected}
            />

            <ScrollArea className="flex-1 bg-whatsapp-grey p-4">
                <div className="space-y-1">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                            <div className="text-center">
                                <p>No messages yet</p>
                                <p className="text-xs mt-1">Send a message to start the conversation</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg.text}
                                isSent={msg.senderId === userId}
                                timestamp={msg.timestamp}
                                senderName={msg.senderId === userId ? userName : otherUserName}
                                isEncrypted={true}
                            />
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            <MessageInput
                onSend={onSendMessage}
                disabled={!isConnected}
            />
        </Card>
    );
}
