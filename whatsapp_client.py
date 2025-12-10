import requests
import json
import base64
import os
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding as sym_padding

# Config
KEY_SERVICE_URL = "http://localhost:5000" # Port-forward key-service
CONNECTION_SERVICE_URL = "ws://localhost:8000" # Port-forward connection-service

class WhatsAppClient:
    def __init__(self, user_id):
        self.user_id = user_id
        self.private_key = None
        self.public_key_pem = None
        self.session_keys = {} # user_id -> aes_key

    def generate_keys(self):
        print(f"[{self.user_id}] Generating RSA keys...")
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        public_key = self.private_key.public_key()
        self.public_key_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')

    def upload_key(self):
        print(f"[{self.user_id}] Uploading public key to Key Service...")
        try:
            resp = requests.post(f"{KEY_SERVICE_URL}/keys", json={
                "user_id": self.user_id,
                "public_key": self.public_key_pem
            })
            if resp.status_code == 201:
                print(f"[{self.user_id}] Key uploaded successfully.")
            else:
                print(f"[{self.user_id}] Failed to upload key: {resp.text}")
        except Exception as e:
            print(f"[{self.user_id}] Error uploading key: {e}")

    def fetch_public_key(self, other_user_id):
        print(f"[{self.user_id}] Fetching public key for {other_user_id}...")
        try:
            resp = requests.get(f"{KEY_SERVICE_URL}/keys/{other_user_id}")
            if resp.status_code == 200:
                pem = resp.json()['public_key']
                return serialization.load_pem_public_key(pem.encode('utf-8'))
            else:
                print(f"[{self.user_id}] User {other_user_id} not found.")
                return None
        except Exception as e:
            print(f"[{self.user_id}] Error fetching key: {e}")
            return None

    def encrypt_message(self, recipient_id, message):
        # 1. Fetch Recipient's Public Key
        recipient_public_key = self.fetch_public_key(recipient_id)
        if not recipient_public_key:
            return None

        # 2. Generate AES Session Key (if not exists, or rotate per message)
        # For simplicity, we generate a new one per message (Signal uses ratchets)
        aes_key = os.urandom(32)
        iv = os.urandom(16)

        # 3. Encrypt Message with AES
        padder = sym_padding.PKCS7(128).padder()
        padded_data = padder.update(message.encode()) + padder.finalize()
        cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv))
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()
        
        # Payload: IV + Ciphertext
        encrypted_payload = base64.b64encode(iv + ciphertext).decode('utf-8')

        # 4. Encrypt AES Key with Recipient's RSA Public Key
        encrypted_key = recipient_public_key.encrypt(
            aes_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        encrypted_key_b64 = base64.b64encode(encrypted_key).decode('utf-8')

        return {
            "recipient_id": recipient_id,
            "encrypted_payload": encrypted_payload,
            "encrypted_key": encrypted_key_b64
        }

    def decrypt_message(self, data):
        # data = { "payload": { "encrypted_payload": "...", "encrypted_key": "..." }, "sender_id": "..." }
        try:
            payload = data['payload']
            encrypted_payload = base64.b64decode(payload['encrypted_payload'])
            encrypted_key = base64.b64decode(payload['encrypted_key'])
            sender_id = data['sender_id']

            # 1. Decrypt AES Key with My Private RSA Key
            aes_key = self.private_key.decrypt(
                encrypted_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )

            # 2. Decrypt Payload with AES Key
            iv = encrypted_payload[:16]
            ciphertext = encrypted_payload[16:]
            
            cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv))
            decryptor = cipher.decryptor()
            padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()
            
            unpadder = sym_padding.PKCS7(128).unpadder()
            plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()
            
            print(f"[{self.user_id}] Decrypted message from {sender_id}: {plaintext.decode()}")
            return plaintext.decode()
        except Exception as e:
            print(f"[{self.user_id}] Decryption failed: {e}")
            return None

# Simulation
if __name__ == "__main__":
    print("This script requires 'requests', 'cryptography', 'websockets' installed.")
    print("Run: pip install requests cryptography websockets")
    print("\n--- Simulation ---")
    
    # 1. Setup Users
    alice = WhatsAppClient("alice")
    alice.generate_keys()
    # alice.upload_key() # Requires running Key Service

    bob = WhatsAppClient("bob")
    bob.generate_keys()
    # bob.upload_key() # Requires running Key Service

    # 2. Mocking Key Fetch (since service might be down)
    # In real run, Alice would call fetch_public_key("bob")
    # Here we manually inject Bob's key into Alice's fetch logic if needed, 
    # but let's assume the encrypt_message function uses the real service.
    # For the sake of this script being runnable standalone as a demo of E2EE:
    
    print("\n[Alice] Encrypting 'Hello Bob, this is a secret!' for Bob...")
    
    # Manually mocking the fetch for demo purposes if service is down
    # In a real scenario, ensure port-forwarding is active.
    
    # Let's verify the crypto logic locally:
    aes_key = os.urandom(32)
    iv = os.urandom(16)
    message = "Hello Bob, this is a secret!"
    
    # Alice Encrypts
    padder = sym_padding.PKCS7(128).padder()
    padded_data = padder.update(message.encode()) + padder.finalize()
    cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    encrypted_payload = base64.b64encode(iv + ciphertext).decode('utf-8')
    
    encrypted_key = bob.private_key.public_key().encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    encrypted_key_b64 = base64.b64encode(encrypted_key).decode('utf-8')
    
    packet = {
        "recipient_id": "bob",
        "sender_id": "alice",
        "payload": {
            "encrypted_payload": encrypted_payload,
            "encrypted_key": encrypted_key_b64
        }
    }
    
    print(f"[Network] Transmitting packet: {json.dumps(packet, indent=2)}")
    
    # Bob Decrypts
    print("\n[Bob] Receiving packet...")
    bob.decrypt_message(packet)
