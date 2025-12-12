import os
import sys
import json
import time
import boto3
import requests
import psycopg2
from kafka import KafkaConsumer, KafkaProducer

# Config
KAFKA_BOOTSTRAP_SERVERS = os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'kafka:9092')
INCOMING_TOPIC = 'incoming-messages'
OUTGOING_TOPIC = 'outgoing-messages'

DB_HOST = os.environ.get('DB_HOST', 'db')
DB_NAME = os.environ.get('DB_NAME', 'mydb')
DB_USER = os.environ.get('DB_USER', 'user')
DB_PASS = os.environ.get('DB_PASS', 'password')

LOCALSTACK_URL = os.environ.get('LOCALSTACK_URL', 'http://localstack:4566')
KMS_KEY_ALIAS = "alias/my-key"
KEYCLOAK_URL = os.environ.get('KEYCLOAK_URL', 'http://keycloak:8080')
KEYCLOAK_REALM = os.environ.get('KEYCLOAK_REALM', 'my-cloud')
KEYCLOAK_CLIENT_ID = os.environ.get('KEYCLOAK_CLIENT_ID', 'chat-processor')
KEYCLOAK_CLIENT_SECRET = os.environ.get('KEYCLOAK_CLIENT_SECRET', 'helloWorld')
AUTH_ENABLED = os.environ.get('AUTH_ENABLED', 'false').lower() == 'true'

# AWS Session Cache
_aws_session = None
_session_expiry = 0

def get_keycloak_token():
    """Get JWT from Keycloak using client credentials grant"""
    if not AUTH_ENABLED:
        print("⚠️  AUTH_ENABLED=false, skipping Keycloak")
        return None
    
    try:
        url = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/token"
        response = requests.post(
            url,
            data={
                "grant_type": "client_credentials",
                "client_id": KEYCLOAK_CLIENT_ID,
                "client_secret": KEYCLOAK_CLIENT_SECRET
            },
            timeout=5
        )
        response.raise_for_status()
        token_data = response.json()
        print(f"✅ Keycloak token acquired (expires in {token_data.get('expires_in')}s)")
        return token_data['access_token']
    except Exception as e:
        print(f"❌ Failed to get Keycloak token: {e}")
        print("   Falling back to hardcoded AWS credentials")
        return None

def get_aws_session():
    """Exchange Keycloak JWT for AWS temporary credentials via STS"""
    global _aws_session, _session_expiry
    
    # Return cached session if still valid (with 5min buffer)
    if _aws_session and time.time() < _session_expiry - 300:
        return _aws_session
    
    # Try to get Keycloak token
    jwt_token = get_keycloak_token()
    
    if not jwt_token or not AUTH_ENABLED:
        # Fallback: Return session with hardcoded credentials
        print("⚠️  Using hardcoded AWS credentials (test/test)")
        _aws_session = boto3.Session(
            aws_access_key_id='test',
            aws_secret_access_key='test',
            region_name='us-east-1'
        )
        _session_expiry = time.time() + 3600  # Cache for 1 hour
        return _aws_session
    
    # STS Federation: Assume role with Keycloak token
    try:
        sts = boto3.client(
            'sts',
            endpoint_url=LOCALSTACK_URL,
            region_name='us-east-1',
            aws_access_key_id='test',  # Bootstrap credentials for STS call
            aws_secret_access_key='test'
        )
        
        assumed_role = sts.assume_role_with_web_identity(
            RoleArn="arn:aws:iam::000000000000:role/MyAppRole",
            RoleSessionName=f"chat-processor-{os.getpid()}",
            WebIdentityToken=jwt_token,
            DurationSeconds=3600  # 1 hour
        )
        
        creds = assumed_role['Credentials']
        _aws_session = boto3.Session(
            aws_access_key_id=creds['AccessKeyId'],
            aws_secret_access_key=creds['SecretAccessKey'],
            aws_session_token=creds['SessionToken'],
            region_name='us-east-1'
        )
        
        _session_expiry = time.time() + 3600
        print(f"✅ AWS session acquired via STS (federated with Keycloak)")
        return _aws_session
        
    except Exception as e:
        print(f"❌ STS AssumeRoleWithWebIdentity failed: {e}")
        print("   Falling back to hardcoded credentials")
        # Fallback
        _aws_session = boto3.Session(
            aws_access_key_id='test',
            aws_secret_access_key='test',
            region_name='us-east-1'
        )
        _session_expiry = time.time() + 3600
        return _aws_session

# AWS KMS Client
def get_kms_client():
    """Get KMS client with federated credentials (or fallbac to hardcoded)"""
    session = get_aws_session()
    return session.client('kms', endpoint_url=LOCALSTACK_URL)

# DB Connection
def get_db_conn():
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

# Kafka Setup
consumer = KafkaConsumer(
    INCOMING_TOPIC,
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_deserializer=lambda x: json.loads(x.decode('utf-8')),
    group_id='chat-processor-group'
)

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def process_messages():
    kms = get_kms_client()
    print("Chat Processor Started")
    
    for message in consumer:
        data = message.value
        sender_id = data.get('sender_id')
        recipient_id = data.get('recipient_id')
        encrypted_payload = data.get('encrypted_payload') # AES encrypted by client
        encrypted_key = data.get('encrypted_key')         # AES key encrypted by RSA (Bob's public key)
        message_id = data.get('message_id') # UUID from client

        if not (sender_id and recipient_id and encrypted_payload and encrypted_key):
            print("Invalid message format")
            continue

        try:
            # === FULL KMS ENVELOPE ENCRYPTION ===
            # Layer 1 (E2EE): encrypted_payload is already encrypted by Alice with Bob's RSA public key
            # Layer 2 (Database encryption): We add KMS envelope encryption for data at rest
            
            # Step 1: Generate a data encryption key (DEK) from KMS
            # This returns both a plaintext DEK and the DEK encrypted by the KMS master key
            kms_resp = kms.generate_data_key(
                KeyId=KMS_KEY_ALIAS,
                KeySpec='AES_256'  # 256-bit AES key
            )
            
            plaintext_data_key = kms_resp['Plaintext']  # 32-byte AES key (for encryption)
            encrypted_data_key = kms_resp['CiphertextBlob']  # DEK encrypted by KMS master key (for storage)
            
            # Step 2: Encrypt the E2EE payload with the data encryption key
            # We're adding ANOTHER layer of encryption on top of the E2EE layer
            from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
            from cryptography.hazmat.backends import default_backend
            from cryptography.hazmat.primitives import padding
            import base64
            
            # Generate random IV for AES-CBC
            iv = os.urandom(16)
            
            # Create AES cipher with the plaintext data key
            cipher = Cipher(
                algorithms.AES(plaintext_data_key),
                modes.CBC(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            
            # Pad the encrypted_payload (which is already a base64/hex string from client)
            # We treat it as bytes for encryption
            payload_bytes = encrypted_payload.encode('utf-8')
            padder = padding.PKCS7(128).padder()  # 128-bit blocks for AES
            padded_payload = padder.update(payload_bytes) + padder.finalize()
            
            # Encrypt the padded payload
            kms_encrypted_content = encryptor.update(padded_payload) + encryptor.finalize()
            
            # Step 3: Prepare storage format
            # Store: IV + encrypted content (both as base64 for DB storage)
            storage_blob = base64.b64encode(iv + kms_encrypted_content).decode('utf-8')
            encrypted_dek_b64 = base64.b64encode(encrypted_data_key).decode('utf-8')
            
            # Note: The encrypted_key from the client (RSA-encrypted AES key for E2EE)
            # is also encrypted with the same data key pattern
            encrypted_key_bytes = encrypted_key.encode('utf-8')
            padder2 = padding.PKCS7(128).padder()
            padded_key = padder2.update(encrypted_key_bytes) + padder2.finalize()
            
            cipher2 = Cipher(algorithms.AES(plaintext_data_key), modes.CBC(iv), backend=default_backend())
            encryptor2 = cipher2.encryptor()
            kms_encrypted_key_content = encryptor2.update(padded_key) + encryptor2.finalize()
            encrypted_key_storage = base64.b64encode(iv + kms_encrypted_key_content).decode('utf-8')
            
            # Step 4: Store in database
            # We store:
            # - encrypted_content: E2EE payload encrypted AGAIN with KMS data key
            # - encrypted_key: Client's RSA-encrypted key, ALSO encrypted with KMS data key  
            # - KMS encrypted DEK (to decrypt both when needed)
            conn = get_db_conn()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO messages (message_id, sender_id, recipient_id, encrypted_content, encrypted_key)
                VALUES (%s, %s, %s, %s, %s)
            """, (message_id, sender_id, recipient_id, storage_blob, encrypted_dek_b64))
            conn.commit()
            cur.close()
            conn.close()
            
            print(f"✅ Message {message_id} stored with KMS envelope encryption")
            print(f"   Encryption layers: E2EE (client) + KMS envelope (server)")

            # Step 5: Send to outgoing topic
            # IMPORTANT: We send the ORIGINAL E2EE data to the recipient
            # They don't need the KMS layer - that's only for database protection
            outgoing_msg = {
                "recipient_id": recipient_id,
                "sender_id": sender_id,
                "payload": {
                    "encrypted_payload": encrypted_payload,  # Original E2EE content
                    "encrypted_key": encrypted_key           # Original RSA-encrypted AES key
                }
            }
            producer.send(OUTGOING_TOPIC, outgoing_msg)

        except Exception as e:
            print(f"❌ Error processing message: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    process_messages()
