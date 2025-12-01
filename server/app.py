import os
import json
import boto3
import redis
import psycopg2
from flask import Flask, request, jsonify

app = Flask(__name__)

# Config
REDIS_HOST = os.environ.get('REDIS_HOST', 'redis')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
DB_HOST = os.environ.get('DB_HOST', 'db')
DB_NAME = os.environ.get('DB_NAME', 'mydb')
DB_USER = os.environ.get('DB_USER', 'user')
DB_PASS = os.environ.get('DB_PASS', 'password')
KEYCLOAK_URL = os.environ.get('KEYCLOAK_URL', 'http://localhost:8080')
LOCALSTACK_URL = os.environ.get('LOCALSTACK_URL', 'http://localhost:4566')
KMS_KEY_ALIAS = "alias/my-key"

# Redis Client (Plaintext - Istio handles mTLS)
r = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True
)

# DB Connection
def get_db_conn():
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

# Initialize DB
def init_db():
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS data (
                key TEXT PRIMARY KEY,
                encrypted_data TEXT,
                encrypted_key TEXT
            )
        """)
        conn.commit()
        cur.close()
        conn.close()
        print("DB Initialized")
    except Exception as e:
        print(f"DB Init Failed: {e}")

# AWS Clients (using IAM Role from container)
# Note: In LocalStack, we need to point to the endpoint.
# The container has AWS_ACCESS_KEY_ID/SECRET/TOKEN from the AssumeRole (if we did it manually)
# OR we rely on the EC2 Metadata service simulation if LocalStack supports it for containers.
# For simplicity, we will assume the container has env vars injected or we use the same flow as client.py
# BUT, the prompt says "each container will have to authenticate... using the identity from keycloak".
# So we must implement the Auth flow here.

def get_aws_session():
    # 1. Get Token from Keycloak (Client Credentials Flow for the Service itself)
    # We use the 'my-microservice' client credentials.
    import requests
    token_url = f"{KEYCLOAK_URL}/realms/my-cloud/protocol/openid-connect/token"
    resp = requests.post(token_url, data={
        "grant_type": "client_credentials",
        "client_id": "my-microservice",
        "client_secret": "helloWorld" 
    })
    if resp.status_code != 200:
        raise Exception(f"Keycloak Auth Failed: {resp.text}")
    
    jwt = resp.json()['access_token']

    # 2. Assume Role via STS
    sts = boto3.client('sts', endpoint_url=LOCALSTACK_URL, region_name='us-east-1')
    role_arn = "arn:aws:iam::000000000000:role/MyAppRole"
    assumed = sts.assume_role_with_web_identity(
        RoleArn=role_arn,
        RoleSessionName="ServerSession",
        WebIdentityToken=jwt
    )
    creds = assumed['Credentials']

    return boto3.Session(
        aws_access_key_id=creds['AccessKeyId'],
        aws_secret_access_key=creds['SecretAccessKey'],
        aws_session_token=creds['SessionToken'],
        region_name='us-east-1'
    )

@app.route('/store', methods=['POST'])
def store():
    print("mTLS Cert Info:", request.headers.get('X-Forwarded-Client-Cert'))
    key = request.json.get('key')
    payload = request.json.get('payload')

    try:
        session = get_aws_session()
        kms = session.client('kms', endpoint_url=LOCALSTACK_URL)

        # 1. Generate Data Key
        dk_resp = kms.generate_data_key(KeyId=KMS_KEY_ALIAS, KeySpec='AES_256')
        plaintext_key = dk_resp['Plaintext']
        encrypted_key = dk_resp['CiphertextBlob'] # bytes

        # 2. Encrypt Payload (Simple XOR for demo, or use cryptography lib)
        # In real world, use AES-GCM. Here we'll just hex encode for simplicity of "encryption" concept
        # combined with the key.
        # Let's use a proper lib if possible, or just mock the "encryption" part if dependencies are tight.
        # We'll use Fernet (symmetric encryption) from cryptography.
        from cryptography.fernet import Fernet
        import base64
        
        # Fernet requires 32-byte url-safe base64 key. 
        # Our KMS key is 32 bytes (AES_256).
        fernet_key = base64.urlsafe_b64encode(plaintext_key)
        f = Fernet(fernet_key)
        encrypted_data = f.encrypt(payload.encode()).decode()

        # 3. Store in DB
        conn = get_db_conn()
        cur = conn.cursor()
        # Store encrypted_key as hex/base64
        enc_key_b64 = base64.b64encode(encrypted_key).decode()
        
        cur.execute("INSERT INTO data (key, encrypted_data, encrypted_key) VALUES (%s, %s, %s) ON CONFLICT (key) DO UPDATE SET encrypted_data = EXCLUDED.encrypted_data, encrypted_key = EXCLUDED.encrypted_key", 
                    (key, encrypted_data, enc_key_b64))
        conn.commit()
        cur.close()
        conn.close()

        # 4. Store in Redis (Read-Through/Write-Through)
        # We store the same structure
        cache_val = json.dumps({
            "encrypted_data": encrypted_data,
            "encrypted_key": enc_key_b64
        })
        r.set(key, cache_val)

        return jsonify({"status": "stored", "key": key})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/retrieve/<key>', methods=['GET'])
def retrieve(key):
    try:
        # 1. Check Redis
        val = r.get(key)
        source = "cache"
        
        if not val:
            source = "db"
            # 2. Check DB
            conn = get_db_conn()
            cur = conn.cursor()
            cur.execute("SELECT encrypted_data, encrypted_key FROM data WHERE key = %s", (key,))
            row = cur.fetchone()
            cur.close()
            conn.close()

            if not row:
                return jsonify({"error": "Not found"}), 404
            
            val_dict = {"encrypted_data": row[0], "encrypted_key": row[1]}
            val = json.dumps(val_dict)
            # Populate Cache
            r.set(key, val)
        
        data = json.loads(val)
        encrypted_data = data['encrypted_data']
        encrypted_key_b64 = data['encrypted_key']

        # 3. Decrypt
        session = get_aws_session()
        kms = session.client('kms', endpoint_url=LOCALSTACK_URL)

        import base64
        from cryptography.fernet import Fernet

        encrypted_key_bytes = base64.b64decode(encrypted_key_b64)
        
        # Decrypt Key via KMS
        dec_resp = kms.decrypt(CiphertextBlob=encrypted_key_bytes)
        plaintext_key = dec_resp['Plaintext']

        # Decrypt Payload
        fernet_key = base64.urlsafe_b64encode(plaintext_key)
        f = Fernet(fernet_key)
        decrypted_payload = f.decrypt(encrypted_data.encode()).decode()

        return jsonify({"key": key, "payload": decrypted_payload, "source": source})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000)
