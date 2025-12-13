#!/usr/bin/env python3
"""
End-to-End User Authentication Test
Tests the complete user authentication flow across all services
"""

import requests
import json
import time

KEYCLOAK_URL = "http://localhost:8080"
REALM = "my-cloud"
KEY_SERVICE_URL = "http://localhost:5000"

def test_user_login(username, password):
    """Test user can login via Keycloak"""
    print(f"\n{'='*60}")
    print(f"Testing User Login: {username}")
    print(f"{'='*60}")
    
    response = requests.post(
        f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "whatsapp-frontend",
            "username": username,
            "password": password
        }
    )
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"✅ Login successful for {username}")
        print(f"   Token type: {token_data.get('token_type')}")
        print(f"   Expires in: {token_data.get('expires_in')} seconds")
        print(f"   Access Token (first 50 chars): {token_data['access_token'][:50]}...")
        return token_data['access_token']
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def test_key_upload(username, token):
    """Test key upload with JWT authentication"""
    print(f"\n{'-'*60}")
    print(f"Testing Key Upload for {username}")
    print(f"{'-'*60}")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    payload = {
        "user_id": username,
        "public_key": f"MOCK_PUBLIC_KEY_FOR_{username.upper()}"
    }
    
    response = requests.post(
        f"{KEY_SERVICE_URL}/keys",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        print(f"✅ Key upload successful for {username}")
        return True
    elif response.status_code == 401:
        print(f"❌ Key upload failed: Unauthorized (401)")
        print(f"   Response: {response.text}")
        return False
    else:
        print(f"❌ Key upload failed ({response.status_code}): {response.text}")
        return False

def test_key_fetch(username, token, target_user):
    """Test key fetch with JWT authentication"""
    print(f"\n{'-'*60}")
    print(f"Testing Key Fetch: {username} fetching {target_user}'s key")
    print(f"{'-'*60}")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(
        f"{KEY_SERVICE_URL}/keys/{target_user}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Key fetch successful")
        print(f"   Public key: {data.get('public_key')}")
        return True
    elif response.status_code == 401:
        print(f"❌ Key fetch failed: Unauthorized (401)")
        print(f"   Response: {response.text}")
        return False
    else:
        print(f"❌ Key fetch failed ({response.status_code}): {response.text}")
        return False

def test_unauthorized_access():
    """Test that requests without tokens are rejected"""
    print(f"\n{'-'*60}")
    print(f"Testing Unauthorized Access (no token)")
    print(f"{'-'*60}")
    
    # Try to upload without token
    response = requests.post(
        f"{KEY_SERVICE_URL}/keys",
        headers={"Content-Type": "application/json"},
        json={"user_id": "alice", "public_key": "FAKE"}
    )
    
    if response.status_code == 401:
        print(f"✅ Unauthorized request properly rejected (401)")
        return True
    else:
        print(f"❌ Expected 401, got {response.status_code}")
        return False

def main():
    print("\n" + "="*60)
    print("  End-to-End User Authentication Test")
    print("  Testing JWT authentication across all services")
    print("="*60)
    
    all_passed = True
    
    # Test 1: Alice logs in
    alice_token = test_user_login("alice", "alice123")
    if not alice_token:
        all_passed = False
    
    # Test 2: Bob logs in
    bob_token = test_user_login("bob", "bob123")
    if not bob_token:
        all_passed = False
    
    # Test 3: Alice uploads her key
    if alice_token and not test_key_upload("alice", alice_token):
        all_passed = False
    
    # Test 4: Bob uploads his key
    if bob_token and not test_key_upload("bob", bob_token):
        all_passed = False
    
    # Test 5: Alice fetches Bob's key
    if alice_token and not test_key_fetch("alice", alice_token, "bob"):
        all_passed = False
    
    # Test 6: Bob fetches Alice's key
    if bob_token and not test_key_fetch("bob", bob_token, "alice"):
        all_passed = False
    
    # Test 7: Unauthorized access
    if not test_unauthorized_access():
        all_passed = False
    
    # Summary
    print("\n" + "="*60)
    if all_passed:
        print("✅ ALL TESTS PASSED")
        print("\nUser authentication is working correctly:")
        print("  ✓ Keycloak user login")
        print("  ✓ JWT token issuance")
        print("  ✓ Authenticated key upload")
        print("  ✓ Authenticated key fetch")
        print("  ✓ Unauthorized access properly rejected")
    else:
        print("❌ SOME TESTS FAILED")
        print("\nPlease check the errors above")
    print("="*60)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
