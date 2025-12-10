# WhatsApp Simulator - End-to-End Encrypted Messaging

A distributed messaging system demonstrating **End-to-End Encryption (E2EE)**, **Envelope Encryption**, and **Zero-Trust Architecture** using modern cloud-native technologies.

This project implements a WhatsApp-like messaging platform with:
- **End-to-End Encryption**: RSA + AES hybrid encryption (similar to Signal Protocol)
- **Microservices Architecture**: Three specialized services handling connections, messages, and key management
- **Event-Driven Design**: Kafka-based asynchronous message processing
- **Zero-Trust Security**: Istio service mesh with automatic mTLS between all services
- **Envelope Encryption**: AWS KMS integration for encryption at rest
- **Identity Management**: Keycloak OIDC authentication

## Architecture

![WhatsApp Simulator Architecture](images/architecture.png)

The diagram above shows the complete system architecture with:
- **Client Layer**: End-to-end encrypted messaging clients (Alice & Bob)
- **Microservices Layer**: Three specialized services for connections, key management, and message processing
- **Message Broker**: Kafka for asynchronous event-driven communication
- **Infrastructure Layer**: PostgreSQL, LocalStack KMS, and Keycloak for data persistence, encryption, and authentication
- **Service Mesh**: Istio + Envoy providing automatic mTLS between all services

## Security Architecture

### 1. End-to-End Encryption (E2EE)
Messages are encrypted on the client side and can only be decrypted by the intended recipient:

- **Key Exchange**: RSA-2048 public keys distributed via Key Service
- **Message Encryption**: 
  - Generate ephemeral AES-256 session key
  - Encrypt message with AES-CBC
  - Encrypt AES key with recipient's RSA public key (OAEP padding)
  - Only recipient's private key can decrypt the session key

### 2. Envelope Encryption (At Rest)
Messages are double-encrypted before storage:

- **Client Layer**: E2EE encryption (only Bob can decrypt)
- **Server Layer**: KMS envelope encryption (protects against database breaches)
- Even if database is compromised, messages remain encrypted under KMS master key

### 3. Transport Security (In Transit)
- **Client ↔ Server**: WebSocket over TLS (can be upgraded to WSS)
- **Service ↔ Service**: Automatic mTLS via Istio/Envoy sidecars
- All inter-service communication is encrypted and authenticated

## Components

### Microservices

#### 1. **Connection Service** (FastAPI + WebSocket)
- Manages persistent WebSocket connections for real-time messaging
- Routes incoming messages to Kafka (`incoming-messages` topic)
- Delivers outgoing messages from Kafka to connected clients
- **Port**: 8000

#### 2. **Key Service** (Flask)
- Public key registry for all users
- Provides key discovery endpoint
- Auto-registers users on first key upload
- **Port**: 5000
- **Endpoints**:
  - `POST /keys` - Upload public key
  - `GET /keys/<user_id>` - Retrieve public key

#### 3. **Chat Processor** (Background Worker)
- Consumes messages from `incoming-messages` Kafka topic
- Applies KMS envelope encryption to encrypted messages
- Persists messages to PostgreSQL
- Publishes to `outgoing-messages` topic for delivery

### Infrastructure

#### **Apache Kafka**
Event streaming platform for asynchronous message processing
- **Topic**: `incoming-messages` - New messages from senders
- **Topic**: `outgoing-messages` - Messages ready for delivery

#### **PostgreSQL Database**
Persistent storage with the following schema:
- `users` - User accounts
- `public_keys` - RSA public keys for E2EE
- `messages` - Encrypted messages with KMS-encrypted keys

#### **LocalStack (KMS)**
Local AWS KMS emulation for envelope encryption
- Creates master encryption key
- Encrypts/decrypts data encryption keys
- Simulates `kms:Encrypt` and `kms:Decrypt` operations

#### **Keycloak**
OpenID Connect (OIDC) identity provider
- User authentication
- OAuth2/OIDC token issuance
- Can be integrated for service-to-service auth

#### **Istio Service Mesh**
Zero-trust networking with automatic mTLS
- Envoy sidecar proxies for all services
- Certificate management and rotation
- Service-to-service authentication and encryption

## Prerequisites

- [Kubernetes Cluster](https://kubernetes.io/) (Kind, Minikube, or Docker Desktop)
- [Istio](https://istio.io/) (`istioctl` installed and initialized)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Docker](https://www.docker.com/)
- Python 3.9+ (for client)

## Setup

### 1. Install Istio
```bash
istioctl install --set profile=demo -y
```

### 2. Build Microservice Images
```bash
# Build all services
docker build -t connection-service:latest ./services/connection-service
docker build -t chat-processor:latest ./services/chat-processor
docker build -t key-service:latest ./services/key-service

# If using Kind, load images into cluster
kind load docker-image connection-service:latest
kind load docker-image chat-processor:latest
kind load docker-image key-service:latest
```

### 3. Deploy to Kubernetes
```bash
# Create namespace with Istio injection enabled
kubectl apply -f k8s/namespace.yaml

# Deploy all components
kubectl apply -f k8s/
```

### 4. Configure Keycloak (Optional)
```bash
# Port forward Keycloak
kubectl -n cloud-demo port-forward svc/keycloak 8080:8080

# Access at http://localhost:8080 (admin/admin)
# Create realm: my-cloud
# Create client: my-microservice
# Create users as needed
```

### 5. Initialize Database
Database schema is automatically initialized via `db-init.yaml` job.

## Usage

### Setup Python Client
```bash
cd /path/to/project
pip install requests cryptography websockets
```

### Running the Demo

#### 1. Port Forward Services
```bash
# Terminal 1: Key Service
kubectl -n cloud-demo port-forward svc/key-service 5000:5000

# Terminal 2: Connection Service
kubectl -n cloud-demo port-forward svc/connection-service 8000:8000
```

#### 2. Run Simulation
```bash
python whatsapp_client.py
```

This demonstrates:
- Alice and Bob generating RSA key pairs
- Local E2EE encryption/decryption
- AES session key encryption with RSA public key
- Message decryption using RSA private key

#### 3. Full Integration (with Running Services)

**Python client** (modify `whatsapp_client.py` or use interactive shell):

```python
from whatsapp_client import WhatsAppClient

# Alice registers
alice = WhatsAppClient("alice")
alice.generate_keys()
alice.upload_key()

# Bob registers
bob = WhatsAppClient("bob")
bob.generate_keys()
bob.upload_key()

# Alice sends encrypted message to Bob
encrypted_packet = alice.encrypt_message("bob", "Hello Bob, this is secret!")
# Send via WebSocket to Connection Service...
```

**Using cURL** (for testing Key Service):

```bash
# Upload Alice's public key
curl -X POST http://localhost:5000/keys \
  -H "Content-Type: application/json" \
  -d '{"user_id": "alice", "public_key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"}'

# Fetch Bob's public key
curl http://localhost:5000/keys/bob
```

## Message Flow

1. **Key Distribution**
   - Alice uploads her RSA public key to Key Service
   - Bob uploads his RSA public key to Key Service

2. **Sending a Message (Alice → Bob)**
   - Alice fetches Bob's public key from Key Service
   - Alice encrypts message with AES-256
   - Alice encrypts AES key with Bob's RSA public key
   - Alice sends `{encrypted_payload, encrypted_key}` via WebSocket to Connection Service

3. **Message Processing**
   - Connection Service publishes message to Kafka (`incoming-messages`)
   - Chat Processor consumes message
   - Chat Processor applies KMS envelope encryption to the already-encrypted key
   - Message stored in PostgreSQL (double-encrypted)
   - Chat Processor publishes to `outgoing-messages` topic

4. **Message Delivery (Bob receives)**
   - Connection Service consumes from `outgoing-messages`
   - Delivers encrypted message to Bob via WebSocket
   - Bob decrypts AES key using his RSA private key
   - Bob decrypts message using AES key
   - **Only Bob can read the message**

## Security Features

### Confidentiality
- ✅ **E2EE**: Messages encrypted client-side, server cannot read content
- ✅ **Envelope Encryption**: Additional KMS encryption at rest
- ✅ **mTLS**: All service-to-service communication encrypted
- ✅ **TLS/WSS**: Client-to-server encryption (when configured)

### Integrity
- ✅ **Cryptographic Signatures**: Can be added to messages (future enhancement)
- ✅ **Message IDs**: Track message delivery and prevent duplicates
- ✅ **Kafka Ordering**: Guaranteed message ordering per partition

### Availability
- ✅ **Microservices**: Independent scaling and fault isolation
- ✅ **Kafka**: Persistent message queue with replication
- ✅ **Database**: Persistent storage with backups

### Zero Trust
- ✅ **mTLS Everywhere**: No plaintext service-to-service communication
- ✅ **Least Privilege**: Each service has minimal permissions
- ✅ **Authentication**: Keycloak OIDC for identity verification

## Project Structure

```
.
├── services/
│   ├── connection-service/     # WebSocket gateway
│   │   ├── app.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── chat-processor/         # Message processor
│   │   ├── app.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── key-service/            # Public key registry
│       ├── app.py
│       ├── Dockerfile
│       └── requirements.txt
├── k8s/                        # Kubernetes manifests
│   ├── namespace.yaml
│   ├── connection-service.yaml
│   ├── chat-processor.yaml
│   ├── key-service.yaml
│   ├── kafka.yaml
│   ├── db.yaml
│   ├── db-init.yaml
│   ├── keycloak.yaml
│   ├── localstack.yaml
│   ├── redis.yaml
│   └── mtls-strict.yaml        # Istio mTLS policy
├── whatsapp_client.py          # Python E2EE client
├── init-aws.sh                 # LocalStack initialization
└── README.md

```

## Future Enhancements

- [ ] **Perfect Forward Secrecy**: Implement Double Ratchet algorithm (like Signal)
- [ ] **Group Chats**: Sender Keys for efficient group encryption
- [ ] **Message Acknowledgments**: Delivery and read receipts
- [ ] **File Sharing**: E2EE file transfer
- [ ] **Voice/Video Calls**: WebRTC with E2EE
- [ ] **Push Notifications**: Firebase Cloud Messaging integration
- [ ] **Mobile Clients**: iOS/Android apps
- [ ] **Web UI**: React/Vue frontend
- [ ] **Rate Limiting**: API throttling and DDoS protection
- [ ] **Metrics & Monitoring**: Prometheus + Grafana dashboards

## Technologies Used

| Component | Technology |
|-----------|-----------|
| **Client** | Python, Cryptography Library |
| **Connection Service** | FastAPI, WebSocket, Kafka |
| **Chat Processor** | Python, Kafka Consumer, Boto3 |
| **Key Service** | Flask, PostgreSQL |
| **Message Broker** | Apache Kafka + Zookeeper |
| **Database** | PostgreSQL |
| **KMS** | LocalStack (AWS KMS emulation) |
| **Identity** | Keycloak (OIDC) |
| **Service Mesh** | Istio + Envoy |
| **Orchestration** | Kubernetes |
| **Encryption** | RSA-2048, AES-256-CBC, OAEP Padding |

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Acknowledgments

This project is inspired by:
- **Signal Protocol**: E2EE messaging protocol
- **WhatsApp**: User experience and features
- **AWS KMS**: Envelope encryption pattern
- **Istio**: Zero-trust service mesh architecture

---

**⚠️ Disclaimer**: This is a proof-of-concept for educational purposes. For production use, conduct a thorough security audit and implement additional hardening measures.
