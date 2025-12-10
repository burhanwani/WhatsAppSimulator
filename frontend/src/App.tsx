import { useState, useEffect } from 'react';
import { ChatWindow, ChatMessage } from './components/ChatWindow';
import { WebSocketManager, Message } from './services/websocket';
import { uploadPublicKey, fetchPublicKey } from './services/keyService';
import {
    generateRSAKeyPair,
    exportPublicKey,
    importPublicKey,
    encryptMessage,
    decryptMessage,
    generateMessageId,
} from './utils/crypto';
import { Loader2 } from 'lucide-react';

interface User {
    id: string;
    name: string;
    color: string;
    publicKey: CryptoKey | null;
    privateKey: CryptoKey | null;
    otherUserPublicKey: CryptoKey | null;
    wsManager: WebSocketManager | null;
    connected: boolean;
}

function App() {
    const [alice, setAlice] = useState<User>({
        id: 'alice',
        name: 'Alice',
        color: '#FF6B6B',
        publicKey: null,
        privateKey: null,
        otherUserPublicKey: null,
        wsManager: null,
        connected: false,
    });

    const [bob, setBob] = useState<User>({
        id: 'bob',
        name: 'Bob',
        color: '#4ECDC4',
        publicKey: null,
        privateKey: null,
        otherUserPublicKey: null,
        wsManager: null,
        connected: false,
    });

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isInitializing, setIsInitializing] = useState(true);
    const [initError, setInitError] = useState<string | null>(null);

    // Initialize users
    useEffect(() => {
        async function initialize() {
            try {
                console.log('Initializing WhatsApp Simulator...');

                // Generate keys for Alice
                console.log('[Alice] Generating RSA key pair...');
                const aliceKeyPair = await generateRSAKeyPair();
                const alicePublicKeyPEM = await exportPublicKey(aliceKeyPair.publicKey);

                // Generate keys for Bob
                console.log('[Bob] Generating RSA key pair...');
                const bobKeyPair = await generateRSAKeyPair();
                const bobPublicKeyPEM = await exportPublicKey(bobKeyPair.publicKey);

                // Upload public keys
                console.log('[Alice] Uploading public key...');
                await uploadPublicKey('alice', alicePublicKeyPEM);

                console.log('[Bob] Uploading public key...');
                await uploadPublicKey('bob', bobPublicKeyPEM);

                // Fetch each other's public keys
                console.log('[Alice] Fetching Bob\'s public key...');
                const bobPublicKeyPEM_fetched = await fetchPublicKey('bob');
                const bobPublicKeyForAlice = await importPublicKey(bobPublicKeyPEM_fetched);

                console.log('[Bob] Fetching Alice\'s public key...');
                const alicePublicKeyPEM_fetched = await fetchPublicKey('alice');
                const alicePublicKeyForBob = await importPublicKey(alicePublicKeyPEM_fetched);

                // Create WebSocket connections
                const aliceWS = new WebSocketManager('alice');
                const bobWS = new WebSocketManager('bob');

                // Set up message handlers
                aliceWS.onMessage(async (msg: Message) => {
                    console.log('[Alice] Received message:', msg);
                    try {
                        const decrypted = await decryptMessage(
                            msg.payload?.encrypted_payload || msg.encrypted_payload,
                            msg.payload?.encrypted_key || msg.encrypted_key,
                            aliceKeyPair.privateKey
                        );

                        const chatMsg: ChatMessage = {
                            id: msg.message_id,
                            text: decrypted,
                            senderId: msg.sender_id,
                            timestamp: msg.timestamp || Date.now(),
                        };

                        setMessages((prev) => [...prev, chatMsg]);
                    } catch (error) {
                        console.error('[Alice] Decryption failed:', error);
                    }
                });

                bobWS.onMessage(async (msg: Message) => {
                    console.log('[Bob] Received message:', msg);
                    try {
                        const decrypted = await decryptMessage(
                            msg.payload?.encrypted_payload || msg.encrypted_payload,
                            msg.payload?.encrypted_key || msg.encrypted_key,
                            bobKeyPair.privateKey
                        );

                        const chatMsg: ChatMessage = {
                            id: msg.message_id,
                            text: decrypted,
                            senderId: msg.sender_id,
                            timestamp: msg.timestamp || Date.now(),
                        };

                        setMessages((prev) => [...prev, chatMsg]);
                    } catch (error) {
                        console.error('[Bob] Decryption failed:', error);
                    }
                });

                // Connection status handlers
                aliceWS.onConnectionChange((connected) => {
                    setAlice(prev => ({ ...prev, connected }));
                });

                bobWS.onConnectionChange((connected) => {
                    setBob(prev => ({ ...prev, connected }));
                });

                // Connect WebSockets
                console.log('[Alice] Connecting WebSocket...');
                await aliceWS.connect();

                console.log('[Bob] Connecting WebSocket...');
                await bobWS.connect();

                // Update state
                setAlice((prev) => ({
                    ...prev,
                    publicKey: aliceKeyPair.publicKey,
                    privateKey: aliceKeyPair.privateKey,
                    otherUserPublicKey: bobPublicKeyForAlice,
                    wsManager: aliceWS,
                    connected: true,
                }));

                setBob((prev) => ({
                    ...prev,
                    publicKey: bobKeyPair.publicKey,
                    privateKey: bobKeyPair.privateKey,
                    otherUserPublicKey: alicePublicKeyForBob,
                    wsManager: bobWS,
                    connected: true,
                }));

                console.log('✅ Initialization complete!');
                setIsInitializing(false);
            } catch (error) {
                console.error('Initialization error:', error);
                setInitError(error instanceof Error ? error.message : 'Unknown error');
                setIsInitializing(false);
            }
        }

        initialize();

        // Cleanup
        return () => {
            alice.wsManager?.disconnect();
            bob.wsManager?.disconnect();
        };
    }, []);

    const handleAliceSend = async (message: string) => {
        if (!alice.otherUserPublicKey || !alice.wsManager) return;

        try {
            const { encrypted_payload, encrypted_key } = await encryptMessage(
                message,
                alice.otherUserPublicKey
            );

            const messageId = generateMessageId();
            const msg: Message = {
                message_id: messageId,
                sender_id: 'alice',
                recipient_id: 'bob',
                encrypted_payload,
                encrypted_key,
                timestamp: Date.now(),
            };

            alice.wsManager.send(msg);

            // Add to local messages (sent)
            const chatMsg: ChatMessage = {
                id: messageId,
                text: message,
                senderId: 'alice',
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, chatMsg]);
        } catch (error) {
            console.error('[Alice] Failed to send message:', error);
        }
    };

    const handleBobSend = async (message: string) => {
        if (!bob.otherUserPublicKey || !bob.wsManager) return;

        try {
            const { encrypted_payload, encrypted_key } = await encryptMessage(
                message,
                bob.otherUserPublicKey
            );

            const messageId = generateMessageId();
            const msg: Message = {
                message_id: messageId,
                sender_id: 'bob',
                recipient_id: 'alice',
                encrypted_payload,
                encrypted_key,
                timestamp: Date.now(),
            };

            bob.wsManager.send(msg);

            // Add to local messages (sent)
            const chatMsg: ChatMessage = {
                id: messageId,
                text: message,
                senderId: 'bob',
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, chatMsg]);
        } catch (error) {
            console.error('[Bob] Failed to send message:', error);
        }
    };

    if (isInitializing) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-whatsapp-green" />
                    <h2 className="text-xl font-semibold text-gray-700">Initializing WhatsApp Simulator...</h2>
                    <p className="text-sm text-gray-500 mt-2">Generating keys and establishing connections</p>
                </div>
            </div>
        );
    }

    if (initError) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">Initialization Failed</h2>
                    <p className="text-sm text-gray-700 mb-4">{initError}</p>
                    <p className="text-xs text-gray-500">
                        Make sure the backend services are running:
                        <br />
                        • Key Service on port 5000
                        <br />
                        • Connection Service on port 8000
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-whatsapp-green text-white rounded-md hover:bg-whatsapp-teal"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-gray-100 p-4">
            <div className="max-w-7xl mx-auto h-full">
                <div className="mb-4 text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-1">
                        WhatsApp Simulator
                    </h1>
                    <p className="text-sm text-gray-600">
                        End-to-End Encrypted Messaging Demo
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 h-[calc(100%-80px)]">
                    <ChatWindow
                        userId={alice.id}
                        userName={alice.name}
                        userColor={alice.color}
                        otherUserId={bob.id}
                        otherUserName={bob.name}
                        messages={messages}
                        onSendMessage={handleAliceSend}
                        isConnected={alice.connected}
                    />

                    <ChatWindow
                        userId={bob.id}
                        userName={bob.name}
                        userColor={bob.color}
                        otherUserId={alice.id}
                        otherUserName={alice.name}
                        messages={messages}
                        onSendMessage={handleBobSend}
                        isConnected={bob.connected}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;
