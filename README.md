# LocalStack + Keycloak OIDC Demo

This project demonstrates how to use **Keycloak** as an OIDC Identity Provider for **LocalStack** (simulating AWS IAM and KMS).

It includes a **Python Flask Server** that implements:
-   **mTLS** communication with Redis.
-   **KMS Envelope Encryption** for data storage.
-   **Read-Through Caching** (Cache-Aside) with Redis and Postgres.
-   **IAM Authentication** via Keycloak.

## Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose
- [Python 3.9+](https://www.python.org/)
- `openssl` (for certificate generation)

## Setup

### 1. Generate Certificates
Generate mTLS certificates for Redis and the Server:
```bash
bash generate_certs.sh
```

### 2. Start Services
Start the Docker containers:
```bash
docker compose up -d --build
```
*Wait a minute for Keycloak and LocalStack to fully initialize.*

### 3. Configure Keycloak (Manual Setup)
Since this is a fresh environment, you must configure Keycloak manually.

1.  **Access the Admin Console**: [http://localhost:8080](http://localhost:8080) (admin/admin).
2.  **Create Realm**: `my-cloud`.
3.  **Create Client**: `my-microservice` (OpenID Connect, Client Auth ON, Service Accounts ON, Direct Access Grants ON).
    -   **Important**: Copy the Client Secret. If it is NOT `helloWorld`, update `server/app.py` and `client.py`.
4.  **Create User**: `user1` (Email: `user1@example.com`, Email Verified: ON, Password: `password123` Permanent).

### 4. Usage

### Backend Server API
The server runs on port **5001**.

#### Store Data (Write-Through)
Encrypts data using KMS and stores it in DB and Redis.
```bash
curl -X POST -H "Content-Type: application/json" \
     -d '{"key": "secret1", "payload": "This is my secret data"}' \
     http://localhost:5001/store
```

#### Retrieve Data (Read-Through)
Fetches encrypted data from Redis (or DB on miss), decrypts it using KMS, and returns plaintext.
```bash
curl http://localhost:5001/retrieve/secret1
```

## Architecture

### Components
-   **Server**: Flask App. Authenticates with Keycloak to get AWS Creds. Uses these creds to call KMS. Connects to Redis via mTLS.
-   **Redis**: TLS-enabled cache. Requires client certificates.
-   **Database**: Postgres. Stores persistent encrypted data.
-   **Keycloak**: OIDC Provider.
-   **LocalStack**: Simulates AWS STS and KMS.

### Security Flow
1.  **Auth**: Server gets JWT from Keycloak.
2.  **IAM**: Server exchanges JWT for AWS Credentials via LocalStack STS.
3.  **Encryption**: Server calls KMS `GenerateDataKey` to get a Data Key.
4.  **Storage**: Server encrypts payload with Data Key. Stores `(EncryptedPayload, EncryptedDataKey)` in DB/Redis.
5.  **Transport**: Server connects to Redis using Client Certificate (mTLS).
