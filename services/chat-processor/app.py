import os
import json
import boto3
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

# AWS Client
def get_kms_client():
    return boto3.client('kms', endpoint_url=LOCALSTACK_URL, region_name='us-east-1',
                        aws_access_key_id='test', aws_secret_access_key='test')

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
            # 1. Encrypt at Rest (KMS Envelope Encryption)
            # We encrypt the 'encrypted_key' again using KMS.
            # This binds the data to this specific KMS key.
            kms_resp = kms.encrypt(
                KeyId=KMS_KEY_ALIAS,
                Plaintext=encrypted_key.encode('utf-8')
            )
            kms_encrypted_key_blob = kms_resp['CiphertextBlob']
            
            # We store the blob as hex or base64 in DB. Let's use hex for simplicity in SQL.
            import binascii
            kms_encrypted_key_hex = binascii.hexlify(kms_encrypted_key_blob).decode()

            # 2. Store in DB
            conn = get_db_conn()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO messages (message_id, sender_id, recipient_id, encrypted_content, encrypted_key)
                VALUES (%s, %s, %s, %s, %s)
            """, (message_id, sender_id, recipient_id, encrypted_payload, kms_encrypted_key_hex))
            conn.commit()
            cur.close()
            conn.close()
            print(f"Stored message {message_id}")

            # 3. Push to Outgoing (for Connection Service to deliver)
            # We send the ORIGINAL encrypted_key (RSA) to the recipient, not the KMS one.
            # The recipient needs to decrypt it with their Private Key.
            outgoing_msg = {
                "recipient_id": recipient_id,
                "sender_id": sender_id,
                "payload": {
                    "encrypted_payload": encrypted_payload,
                    "encrypted_key": encrypted_key
                }
            }
            producer.send(OUTGOING_TOPIC, outgoing_msg)

        except Exception as e:
            print(f"Error processing message: {e}")

if __name__ == "__main__":
    process_messages()
