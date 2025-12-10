# WhatsApp Simulator - Frontend

A modern React + TypeScript frontend for the WhatsApp Simulator with end-to-end encryption.

## Features

- **Split-Screen Chat UI**: Dual WhatsApp-like interfaces for Alice and Bob
- **End-to-End Encryption**: Client-side RSA + AES encryption using Web Crypto API
- **Real-Time Messaging**: WebSocket connections for instant message delivery
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **WhatsApp-Styled**: Green message bubbles, timestamps, encryption indicators

## Prerequisites

Before running the frontend, ensure these backend services are running:

1. **Key Service** on port **5001** (not 5000 due to macOS conflict)
2. **Connection Service** on port 8000

```bash
# Terminal 1 - Key Service (note port 5001, not 5000)
kubectl port-forward svc/key-service 5001:5000 -n cloud-demo

# Terminal 2 - Connection Service
kubectl port-forward svc/connection-service 8000:8000 -n cloud-demo
```

> **Note**: Port 5000 is often used by macOS AirPlay/Control Center, so we use port 5001 instead.

## Installation

```bash
cd frontend
npm install
```

## Running the Application

```bash
npm run dev
```

The application will start at `http://localhost:5173`

## How It Works

### Initialization Flow

1. **Key Generation**: Alice and Bob each generate RSA-2048 key pairs
2. **Key Upload**: Public keys are uploaded to the Key Service
3. **Key Exchange**: Each user fetches the other's public key
4. **WebSocket Connection**: Both users connect to the Connection Service

### Messaging Flow

1. **Compose**: User types message in their chat window
2. **Encrypt**: Message is encrypted with AES-256, AES key is encrypted with recipient's RSA public key
3. **Send**: Encrypted payload sent via WebSocket to Connection Service
4. **Route**: Message flows through Kafka → Chat Processor → PostgreSQL → Kafka
5. **Deliver**: Connection Service delivers encrypted message to recipient's WebSocket
6. **Decrypt**: Recipient decrypts AES key with private RSA key, then decrypts message
7. **Display**: Plaintext message appears in chat window

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── scroll-area.tsx
│   │   ├── ChatHeader.tsx    # User header with status
│   │   ├── ChatWindow.tsx    # Main chat interface
│   │   ├── MessageBubble.tsx # Individual message display
│   │   └── MessageInput.tsx  # Message input field
│   ├── services/
│   │   ├── keyService.ts     # Key Service API client
│   │   └── websocket.ts      # WebSocket manager
│   ├── utils/
│   │   └── crypto.ts         # E2EE cryptography utilities
│   ├── lib/
│   │   └── utils.ts          # Tailwind utilities
│   ├── App.tsx               # Main application
│   ├── main.tsx              # React entry point
│   └── index.css             # Global styles
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Lucide React** - Icons
- **Web Crypto API** - Cryptography
- **date-fns** - Date formatting

## Security Features

- ✅ **RSA-2048**: Public key cryptography for key exchange
- ✅ **AES-256-CBC**: Symmetric encryption for message content
- ✅ **Client-Side Encryption**: Messages encrypted before leaving the browser
- ✅ **Zero-Knowledge Server**: Server never sees plaintext messages
- ✅ **Secure Key Storage**: Private keys never leave the browser

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Troubleshooting

### Port 5000 Already in Use

**Issue**: macOS uses port 5000 for AirPlay/Control Center

**Solution**: The frontend is already configured to use port 5001. Just ensure you port-forward correctly:
```bash
kubectl port-forward svc/key-service 5001:5000 -n cloud-demo
```

### WebSocket Connection Failed

Ensure Connection Service is running and accessible:
```bash
curl http://localhost:8000/
```

Should return: `{"detail":"Not Found"}` (this is normal - it only handles WebSocket connections)

### Key Upload Failed

Ensure Key Service is running and accessible:
```bash
curl -H "Origin: http://localhost:5173" http://localhost:5001/keys/test
```

Should return: `{"error":"User not found"}` (this is normal for a non-existent user)

### CORS Issues

The backend services have CORS enabled for `http://localhost:5173`. If you still see CORS errors:

1. Ensure you're using the latest images with CORS support
2. Check that both services are running:
   ```bash
   kubectl get pods -n cloud-demo | grep -E "key-service|connection-service"
   ```
3. Check service logs for errors:
   ```bash
   kubectl logs -n cloud-demo deployment/key-service -c key-service --tail=20
   ```

### Database Errors (500 Internal Server Error)

If you see "Foreign key constraint" errors:
```bash
kubectl apply -f k8s/db-init-job.yaml
kubectl wait --for=condition=complete job/db-init -n cloud-demo --timeout=60s
```

## License

MIT License - Same as parent project
